import * as alt from "alt-client";
import * as natives from "natives";

const LOCAL_PLAYER = alt.Player.local;
const VEHICLE_LOOK_RANGE = 8;
const VEHICLE_DETECTION_RANGE = 6;

const USE_RAYCAST = true;

const ENTER_AS_DRIVER_KEY = 70; // F
const ENTER_AS_PASSENGER_KEY = 71; // G
const PASSENGER_MODE_KEY = 16; // Shift

export function rotationToDirection(rotation) {
  const z = rotation.z;
  const x = rotation.x;
  const num = Math.abs(Math.cos(x));

  return new alt.Vector3(-Math.sin(z) * num, Math.cos(z) * num, Math.sin(x));
}

export function raycastGamePlayCamera(distance = 5.0) {
  let cameraRotation = natives.getGameplayCamRot(2);
  let cameraCoord = natives.getGameplayCamCoord();
  let direction = rotationToDirection(cameraRotation.toRadians());

  let destination = {
    x: cameraCoord.x + direction.x * distance,
    y: cameraCoord.y + direction.y * distance,
    z: cameraCoord.z + direction.z * distance,
  };

  let [_testState, hit, hitPos, _surfaceNormal, hitEntity] =
    natives.getShapeTestResult(
      natives.startExpensiveSynchronousShapeTestLosProbe(
        cameraCoord.x,
        cameraCoord.y,
        cameraCoord.z,
        destination.x,
        destination.y,
        destination.z,
        -1,
        LOCAL_PLAYER.scriptID,
        0
      )
    );

  return {
    hit,
    coords: hitPos,
    entity: hitEntity,
  };
}

export function getLookingOrClosestVehicle() {
  if (USE_RAYCAST) {
    const rayResult = raycastGamePlayCamera(VEHICLE_LOOK_RANGE);

    if (rayResult.hit && natives.isEntityAVehicle(rayResult.entity)) {
      return alt.Vehicle.getByScriptID(rayResult.entity);
    }
  }

  return alt.Utils.getClosestVehicle({
    pos: LOCAL_PLAYER.pos,
    range: VEHICLE_DETECTION_RANGE,
  });
}

export function enterVehicleAsDriver() {
  if (
    alt.isCursorVisible() ||
    LOCAL_PLAYER.vehicle ||
    !natives.getIsTaskActive(LOCAL_PLAYER.scriptID, 6)
  )
    return;

  let vehicle = getLookingOrClosestVehicle();

  if (vehicle === null || !vehicle.valid) return;
  if (!natives.isVehicleSeatFree(vehicle.scriptID, -1, false)) return;

  natives.taskEnterVehicle(
    LOCAL_PLAYER.scriptID,
    vehicle.scriptID,
    5000,
    -1,
    1.0,
    1,
    null
  );
}

export function enterVehicleAsPassenger() {
  if (
    alt.isCursorVisible() ||
    LOCAL_PLAYER.vehicle ||
    !natives.getIsTaskActive(LOCAL_PLAYER.scriptID, 6)
  )
    return;

  let vehicle = getLookingOrClosestVehicle();

  if (vehicle === null || !vehicle.valid) return;
  if (natives.isThisModelABicycle(vehicle.model)) return;

  if (natives.isThisModelABike(vehicle.model)) {
    return natives.isVehicleSeatFree(vehicle.scriptID, 0, false)
      ? natives.taskEnterVehicle(
          LOCAL_PLAYER.scriptID,
          vehicle.scriptID,
          5000,
          0,
          1.0,
          1,
          null
        )
      : undefined;
  }

  const seatsBones = [
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_f"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r1"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r2"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r3"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r4"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r5"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r6"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_dside_r7"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r1"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r2"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r3"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r4"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r5"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r6"),
    natives.getEntityBoneIndexByName(vehicle.scriptID, "seat_pside_r7"),
  ];

  const seatsPositions = [];

  for (const seatBone of seatsBones) {
    if (seatBone === -1) continue;
    seatsPositions.push(
      natives.getWorldPositionOfEntityBone(vehicle.scriptID, seatBone)
    );
  }

  // Get closest seat
  let closestFreeSeatNumber = -1;
  let closestSeatDistance = Number.MAX_SAFE_INTEGER;

  const grabSeats = new Set([3, 4, 5, 6]);

  for (let i = 0; i < seatsPositions.length; i++) {
    if (!natives.isVehicleSeatFree(vehicle.scriptID, i, true)) continue;
    if (grabSeats.has(i) && !alt.isKeyDown(PASSENGER_MODE_KEY)) continue;

    const seatDistance = LOCAL_PLAYER.pos.distanceTo(seatsPositions[i]);
    if (seatDistance > closestSeatDistance) continue;

    closestSeatDistance = seatDistance;
    closestFreeSeatNumber = i;
  }

  if (closestFreeSeatNumber === -1) return;

  const lastAnimatableSeatOverrides = {
    [alt.hash("journey")]: 0,
    [alt.hash("journey2")]: 0,
  };

  const lastAnimatableSeat = lastAnimatableSeatOverrides[vehicle.model] ?? 6;

  if (closestFreeSeatNumber < lastAnimatableSeat) {
    return natives.taskEnterVehicle(
      LOCAL_PLAYER.scriptID,
      vehicle.scriptID,
      5000,
      closestFreeSeatNumber,
      1.0,
      1,
      null
    );
  } else {
    return natives.taskEnterVehicle(
      LOCAL_PLAYER.scriptID,
      vehicle.scriptID,
      5000,
      closestFreeSeatNumber,
      1.0,
      16,
      null
    );
  }
}

export function cancelDefaultEntering() {
  natives.disableControlAction(0, 23, true); // F - Enter
  if (LOCAL_PLAYER.vehicle && LOCAL_PLAYER.vehicle.lockState === 2 /* Locked */)
    natives.disableControlAction(0, 75, true); // F - Exit
}

export function handleVehicleCancelEntering() {
  if (!LOCAL_PLAYER.valid) return;

  if (natives.getIsTaskActive(LOCAL_PLAYER.scriptID, 163)) return;
  if (!natives.getIsTaskActive(LOCAL_PLAYER.scriptID, 160)) return;

  if (
    !natives.isControlJustPressed(0, 32) &&
    !natives.isControlJustPressed(0, 33) &&
    !natives.isControlJustPressed(0, 34) &&
    !natives.isControlJustPressed(0, 35)
  )
    return;

  natives.clearPedTasks(LOCAL_PLAYER.scriptID);
  return;
}

export function disableWindowBreaking() {
  const vehicleScriptID = natives.getVehiclePedIsTryingToEnter(
    LOCAL_PLAYER.scriptID
  );

  if (!vehicleScriptID) return;

  const vehicle = alt.Vehicle.getByScriptID(vehicleScriptID);
  if (vehicle === null || !vehicle.valid) return;

  if (vehicle.lockState !== 1 /* Unlocked */) return;
  if (!natives.isPedTryingToEnterALockedVehicle(LOCAL_PLAYER.scriptID)) return;

  natives.clearPedTasksImmediately(LOCAL_PLAYER.scriptID);
}

alt.on("keydown", (key) => {
  if (!LOCAL_PLAYER.valid || !alt.gameControlsEnabled()) return;

  if (!LOCAL_PLAYER.vehicle) {
    if (key === ENTER_AS_DRIVER_KEY) {
      return enterVehicleAsDriver();
    }

    if (key === ENTER_AS_PASSENGER_KEY) {
      return enterVehicleAsPassenger();
    }
  }
});

alt.everyTick(() => {
  cancelDefaultEntering();
  handleVehicleCancelEntering();
  disableWindowBreaking();
});
