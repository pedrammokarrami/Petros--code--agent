from test_smooth_damp_math import Vector3, smooth_damp

pos = Vector3(26, 18, 32)
target1 = Vector3(0, 6, 22)
target2 = Vector3(12, 5, 14)
vel = Vector3(0, 0, 0)
smooth_time = 0.45
max_speed = 50.0

current_target = target1
print("Testing MID-FLIGHT RETARGETING at Frame 15:")
for frame in range(45):
    if frame == 15:
        print(">>> USER CLICKS ROOM 2 MID-FLIGHT! Changing target to (12, 5, 14)...")
        current_target = target2

    prev_pos = Vector3(pos.x, pos.y, pos.z)
    smooth_damp(pos, current_target, vel, smooth_time, max_speed, 0.0166)
    step_dist = pos.distance_to(prev_pos)
    rem_dist = pos.distance_to(current_target)
    print(f"Frame {frame:02d}: step={step_dist:5.3f} | rem={rem_dist:6.3f} | vel={vel.length():5.2f} | pos={pos}")
