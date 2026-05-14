from PIL import Image, ImageDraw, ImageFont
import os

def create_gradient(width, height, top_color, bottom_color):
    base = Image.new('RGB', (width, height), top_color)
    top = Image.new('RGB', (width, height), top_color)
    bottom = Image.new('RGB', (width, height), bottom_color)
    mask = Image.new('L', (width, height))
    for y in range(height):
        mask.putpixel((0, y), int(255 * (y / height)))
    mask = mask.resize((width, height))
    return Image.composite(bottom, top, mask)

def draw_icon(draw, x, y, size, color):
    # Simplistic PageGist icon: Document shape + Sparkle
    padding = size // 5
    doc_w = size - (padding * 2)
    doc_h = size - (padding * 2)
    
    # Rounded document
    draw.rounded_rectangle([x+padding, y+padding, x+padding+doc_w, y+padding+doc_h], 
                           radius=size//10, outline=None, fill=color)
    
    # Lines on document
    line_w = doc_w // 2
    for i in range(3):
        ly = y + padding + (doc_h // 3) + (i * (doc_h // 5))
        draw.line([x+padding + (doc_w // 4), ly, x+padding + (doc_w // 4) + line_w, ly], fill="white", width=max(1, size//20))

def generate_assets():
    blue_top = (59, 130, 246)
    blue_bottom = (37, 99, 235)
    
    # 1. Store Icon (128x128)
    icon = create_gradient(128, 128, blue_top, blue_bottom)
    draw = ImageDraw.Draw(icon)
    draw_icon(draw, 0, 0, 128, blue_top)
    icon.save('store_icon_generated.png')
    
    # 2. Promo Tile (440x280)
    promo = create_gradient(440, 280, blue_top, blue_bottom)
    draw = ImageDraw.Draw(promo)
    # Add Logo
    draw_icon(draw, 20, 20, 80, blue_top)
    # Add Text (Mocking Inter with default)
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 18)
    except:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()
        
    draw.text((120, 40), "PageGist", fill="white", font=font_large)
    draw.text((120, 85), "AI Reading Companion", fill="white", font=font_small)
    draw.text((20, 180), "Summarize, Explain, and Deep-Dive\ninto any webpage with Gemini Nano.", fill="white", font=font_small)
    promo.save('promo_tile_generated.png')
    
    # 3. Marquee Tile (920x680)
    marquee = create_gradient(920, 680, blue_top, blue_bottom)
    draw = ImageDraw.Draw(marquee)
    draw_icon(draw, 40, 40, 120, blue_top)
    draw.text((180, 80), "PageGist", fill="white", font=font_large)
    # Add a fake side panel shape
    draw.rounded_rectangle([550, 100, 850, 580], radius=20, fill=(255,255,255, 30))
    draw.text((40, 300), "The most powerful AI sidebar\nfor your browser.", fill="white", font=font_large)
    marquee.save('marquee_tile_generated.png')
    
    # 4. Large Marquee Promo Tile (1400x560) - No Alpha
    large_marquee = create_gradient(1400, 560, blue_top, blue_bottom)
    draw_large = ImageDraw.Draw(large_marquee)
    draw_icon(draw_large, 60, 60, 150, blue_top)
    draw_large.text((250, 100), "PageGist", fill="white", font=font_large)
    draw_large.text((60, 350), "Your Intelligent AI Reading Companion\nSummarize any page instantly.", fill="white", font=font_large)
    
    # Ensure no alpha channel
    large_marquee = large_marquee.convert('RGB')
    large_marquee.save('marquee_large_generated.png')

if __name__ == "__main__":
    generate_assets()
