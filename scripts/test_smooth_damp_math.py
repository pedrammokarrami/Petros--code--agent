import math

class Vector3:
    def __init__(self, x=0.0, y=0.0, z=0.0):
        self.x, self.y, self.z = float(x), float(y), float(z)
    def copy(self, v):
        self.x, self.y, self.z = v.x, v.y, v.z
        return self
    def set(self, x, y, z):
        self.x, self.y, self.z = float(x), float(y), float(z)
        return self
    def distance_to(self, v):
        return math.sqrt((self.x - v.x)**2 + (self.y - v.y)**2 + (self.z - v.z)**2)
    def length(self):
        return math.sqrt(self.x**2 + self.y**2 + self.z**2)
    def __repr__(self):
        return f"({self.x:6.2f}, {self.y:5.2f}, {self.z:6.2f})"

def smooth_damp(current, target, current_vel, smooth_time, max_speed, dt):
    smooth_time = max(0.0001, smooth_time)
    omega = 2.0 / smooth_time
    x = omega * dt
    exp = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x)

    change_x = current.x - target.x
    change_y = current.y - target.y
    change_z = current.z - target.z

    max_change = max_speed * smooth_time
    sq_dist = change_x * change_x + change_y * change_y + change_z * change_z
    if sq_dist > max_change * max_change:
        dist = math.sqrt(sq_dist)
        change_x = (change_x / dist) * max_change
        change_y = (change_y / dist) * max_change
        change_z = (change_z / dist) * max_change

    target_x = current.x - change_x
    target_y = current.y - change_y
    target_z = current.z - change_z

    temp_x = (current_vel.x + omega * change_x) * dt
    temp_y = (current_vel.y + omega * change_y) * dt
    temp_z = (current_vel.z + omega * change_z) * dt

    current_vel.x = (current_vel.x - omega * temp_x) * exp
    current_vel.y = (current_vel.y - omega * temp_y) * exp
    current_vel.z = (current_vel.z - omega * temp_z) * exp

    out_x = target_x + (change_x + temp_x) * exp
    out_y = target_y + (change_y + temp_y) * exp
    out_z = target_z + (change_z + temp_z) * exp

    orig_dx = target.x - current.x
    orig_dy = target.y - current.y
    orig_dz = target.z - current.z
    out_dx = out_x - target.x
    out_dy = out_y - target.y
    out_dz = out_z - target.z

    if (orig_dx * out_dx + orig_dy * out_dy + orig_dz * out_dz) > 0:
        out_x, out_y, out_z = target.x, target.y, target.z
        current_vel.set(0, 0, 0)

    current.set(out_x, out_y, out_z)
    return current

# Simulate a 1.2s transition with 60 FPS (dt = 0.0167s)
pos = Vector3(26, 18, 32)
target = Vector3(0, 6, 22)
vel = Vector3(0, 0, 0)
smooth_time = 0.45
max_speed = 50.0

print("Testing SmoothDamp trajectory:")
for frame in range(40):
    prev_pos = Vector3(pos.x, pos.y, pos.z)
    smooth_damp(pos, target, vel, smooth_time, max_speed, 0.0166)
    step_dist = pos.distance_to(prev_pos)
    rem_dist = pos.distance_to(target)
    print(f"Frame {frame:02d}: step={step_dist:5.3f} | rem={rem_dist:6.3f} | vel={vel.length():5.2f} | pos={pos}")
    if rem_dist < 0.02 and vel.length() < 0.05:
        print(f"Settled smoothly at frame {frame}!")
        break
