import sys

with open(r"C:\Users\ELI\tools\Petros-Supervisor\petros_supervisor.py", "r", encoding="utf-8") as f:
    text = f.read()

target = "import sys\n"
replacement = "import sys\nif hasattr(sys.stdout, 'reconfigure'):\n    sys.stdout.reconfigure(encoding='utf-8')\n"
if target in text and "reconfigure" not in text:
    text = text.replace(target, replacement, 1)
    with open(r"C:\Users\ELI\tools\Petros-Supervisor\petros_supervisor.py", "w", encoding="utf-8") as f:
        f.write(text)
    print("Patched petros_supervisor.py successfully!")
else:
    print("Already patched or target not found")
