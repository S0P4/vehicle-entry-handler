# alt:V Vehicle Entry Handle

This resource provides a custom way of handling how the player enters a vehicle.

## What does it do?
- Pressing `F` will make the player try to enter the closest or looking(*) vehicle as the driver.
- Pressing `G` will make the player try to enter the closest or looking(*) vehicle as a passenger.
- Pressing `SHIFT + G` will make the player hang from the vehicle (seats 3 to 6).
- Pressing `W`, `A`, `S` or `D` when the player is trying to enter a vehicle will cancel the task.
- The script will also prevent the player from entering locked vehicles and breaking locked windows.

>(*) If the player is near two vehicles and the player looks at one of them, the script will give priority to the one the player is looking at. 

## How to install

Download the repository and copy the folder into your resources folder, also add the resource to your `server.toml`.