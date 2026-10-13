"""Original test tooltips and code-drawn Sanctum icon. No game assets or fonts bundled."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
font_path = 'C:/Windows/Fonts/arial.ttf'
image = Image.new('RGB', (720, 540), '#101416')
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((6, 6, 713, 533), radius=10, outline='#c0a174', width=2)
lines = [
    ('RING OF THE TEMPEST', '#e8cca0', 34),
    ('Unique Ring', '#dfd6c2', 25),
    ('800 Item Power', '#bdbdaf', 25),
    ('+10.5% Critical Strike Chance', '#e7e6df', 27),
    ('+12% Attack Speed', '#e7e6df', 27),
    ('Aspect: Stormweaver', '#e8cca0', 27),
    ('Required Level 70', '#bdbdaf', 25),
]
y = 45
for text, color, size in lines:
    draw.text((38, y), text, font=ImageFont.truetype(font_path, size), fill=color)
    y += 63
image.save(root / 'tests/fixtures/tooltip.png')
image.save(root / 'public/fixture-tooltip.png')
small = image.resize((360, 270))
small.save(root / 'tests/fixtures/tooltip-small.png')
icon = Image.new('RGBA', (512, 512), '#151b1b')
pen = ImageDraw.Draw(icon)
pen.rounded_rectangle((8, 8, 504, 504), radius=105, outline='#645537', width=8)
gold = '#d6b77d'
pen.line([(256,55),(425,153),(425,353),(256,452),(87,353),(87,153),(256,55)], fill=gold, width=9)
pen.line([(256,119),(356,336),(156,336),(256,119)], fill=gold, width=14)
pen.line([(256,210),(256,407)], fill=gold, width=14)
pen.line([(192,274),(320,274)], fill=gold, width=12)
icon.save(root / 'resources/icon.png')
icon.save(root / 'resources/icon.ico', sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
print('Original fixture images and app icon generated.')
