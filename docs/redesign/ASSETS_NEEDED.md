# Assets Needed for Luminous Scan Point Cloud Pipeline

The following GLB asset packs are needed for offline sampling into high-density point cloud models.
Drop incoming raw files into `assets/inbox/`.

| Category | Pack Name / Model | Format | Max Poly | Intended Scene | License / Source |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **People** | Tech Team Character Pack (Dev, Lead, Designer, Analyst) with seated/typing clips | GLB | <=50k tris | Dev Room (Hero), Welcome, App | CC0 / Mixamo / Kenney |
| **Office** | Modern Developer Desk, Multi-monitor cluster, Ergonomic Chair, Whiteboard | GLB | <=30k tris | Dev Room (Hero) | CC0 / Poly Pizza |
| **Store** | Retail Display Shelf, POS Terminal, Checkout Counter | GLB | <=30k tris | Commerce Room | CC0 / Kenney Furniture |
| **Market** | Radar Core, Planetary Sphere, Holographic Pillar | GLB | <=25k tris | Market Radar Scene | CC0 / Poly Pizza |
| **Hardware** | Modern Smartphone Chasis (Phone frame), Server Rack | GLB | <=20k tris | App Preview, Architecture | CC0 / Poly Pizza |

### Inbox Placement
Place files directly in:
`assets/inbox/<category>/<model_name>.glb`

Once placed, run:
`node scripts/sample_glb_to_points.mjs --input assets/inbox/ --output public/assets/scenes/`
