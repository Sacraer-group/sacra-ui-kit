from pathlib import Path
R=Path(__file__).resolve().parents[1]
assert (R/'sacra-ui.css').exists()
assert (R/'src/sacra-controls.js').exists()
print('SACRA smoke OK')
