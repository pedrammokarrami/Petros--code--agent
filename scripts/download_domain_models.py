import os
import urllib.request
import json

base_url = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models'
PETROS_ROOT = r'C:\Users\ELI\Petros'

targets = {
    os.path.join(PETROS_ROOT, 'public', 'models', 'agency'): [
        ('sheen-chair.glb', 'SheenChair/glTF-Binary/SheenChair.glb', 'Khronos Group CC-BY 4.0 / PBR sample'),
        ('executive-chair.glb', 'ChairDamaskPurplegold/glTF-Binary/ChairDamaskPurplegold.glb', 'Khronos Group CC0 / PBR sample'),
        ('glass-vase-flowers.glb', 'GlassVaseFlowers/glTF-Binary/GlassVaseFlowers.glb', 'Khronos Group CC0 sample')
    ],
    os.path.join(PETROS_ROOT, 'public', 'models', 'commerce'): [
        ('shipping-box-animated.glb', 'BoxAnimated/glTF-Binary/BoxAnimated.glb', 'Khronos Group CC0 sample'),
        ('retail-water-bottle.glb', 'WaterBottle/glTF-Binary/WaterBottle.glb', 'Khronos Group CC0 sample'),
        ('delivery-logistics-truck.glb', 'CesiumMilkTruck/glTF-Binary/CesiumMilkTruck.glb', 'Cesium CC-BY 4.0 sample'),
        ('shipping-crate.glb', 'BoxTextured/glTF-Binary/BoxTextured.glb', 'Khronos Group CC0 sample')
    ],
    os.path.join(PETROS_ROOT, 'public', 'models', 'content'): [
        ('studio-camera.glb', 'AntiqueCamera/glTF-Binary/AntiqueCamera.glb', 'Khronos Group CC0 sample'),
        ('broadcast-audio-boombox.glb', 'BoomBox/glTF-Binary/BoomBox.glb', 'Khronos Group CC0 sample')
    ],
    os.path.join(PETROS_ROOT, 'public', 'models', 'research'): [
        ('neural-brain-stem.glb', 'BrainStem/glTF-Binary/BrainStem.glb', 'Khronos Group CC0 sample'),
        ('iridescence-optic-sensor.glb', 'IridescenceLamp/glTF-Binary/IridescenceLamp.glb', 'Khronos Group CC0 sample')
    ]
}

manifest = {}

for folder, items in targets.items():
    os.makedirs(folder, exist_ok=True)
    # Also create in dist
    dist_folder = folder.replace(os.path.join(PETROS_ROOT, 'public'), os.path.join(PETROS_ROOT, 'dist'))
    os.makedirs(dist_folder, exist_ok=True)

    rel_key = os.path.relpath(folder, PETROS_ROOT)
    manifest[rel_key] = []

    for filename, rel_path, license_info in items:
        dest_path = os.path.join(folder, filename)
        dist_path = os.path.join(dist_folder, filename)

        if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
            print(f'Already exists in public: {filename} ({os.path.getsize(dest_path)} bytes)')
            if not os.path.exists(dist_path):
                with open(dest_path, 'rb') as f_in, open(dist_path, 'wb') as f_out:
                    f_out.write(f_in.read())
            manifest[rel_key].append({'file': filename, 'size': os.path.getsize(dest_path), 'license': license_info})
            continue

        url = f'{base_url}/{rel_path}'
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                with open(dest_path, 'wb') as f:
                    f.write(data)
                with open(dist_path, 'wb') as f:
                    f.write(data)
                print(f'Downloaded {filename} -> public & dist: {len(data)} bytes')
                manifest[rel_key].append({'file': filename, 'size': len(data), 'license': license_info})
        except Exception as e:
            print(f'FAILED {filename} from {url}: {e}')

with open(os.path.join(PETROS_ROOT, 'public', 'models', 'ATTRIBUTION.json'), 'w') as f:
    json.dump(manifest, f, indent=2)

print('All domain models downloaded and synced to both public and dist!')
