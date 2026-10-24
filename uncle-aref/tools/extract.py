"""Cut the approved reference art into reusable layers (assets/cutouts)."""
import numpy as np
from PIL import Image
from scipy import ndimage
from common import ref, cutout, inpaint, CUT, os

s1, s2, s4 = ref("sheet1_poses.png"), ref("sheet2_expressions.png"), ref("sheet4_taxi.png")
s3 = ref("sheet3_model.png")


def save(img, name):
    img.save(os.path.join(CUT, name + ".png"))
    print(name, img.size)


# --- Sheet 2: 12 expression busts (bottom edge is the cell cut, so no matte there)
cols = [(8, 240), (244, 500), (510, 766), (776, 1016), (1027, 1285), (1294, 1528)]
names = ["neutral", "smile", "laugh", "curious", "thinking", "surprised",
         "skeptical", "concerned", "story", "embarrassed", "pleased", "warning"]
for i, nm in enumerate(names):
    x0, x1 = cols[i % 6]
    y0, y1 = (112, 371) if i < 6 else (415, 670)
    img, _ = cutout(s2.crop((x0, y0, x1, y1)), sides="tlr", tol=12, erode=5)
    save(img, f"head_{i+1:02d}_{nm}")

# --- Sheet 2: mouth tiles + blink tiles (kept as rectangles, blended with a feathered mask later)
mx = [(17, 145), (153, 281), (289, 417), (426, 554), (564, 692), (705, 833), (845, 973), (985, 1113)]
for i, (x0, x1) in enumerate(mx):
    save(s2.crop((x0, 749, x1, 880)), f"mouth_{i+1}")
for i, (x0, x1) in enumerate([(1149, 1258), (1273, 1386), (1399, 1510)]):
    save(s2.crop((x0, 749, x1, 880)), f"eyes_{['open','half','closed'][i]}")

# --- Sheet 4: accessories
for i, (x0, x1) in enumerate([(30, 140), (150, 265), (270, 395)]):
    img, _ = cutout(s4.crop((x0, 770, x1, 955)), sides="tlrb", tol=22)
    save(img, f"dog_{['up','mid','down'][i]}")
save(cutout(s4.crop((425, 770, 615, 990)), sides="tlrb", tol=20, all_bg=True)[0], "wheel")
save(cutout(s4.crop((728, 800, 995, 985)), sides="tlrb")[0], "dashmat")
save(cutout(s4.crop((1030, 770, 1180, 862)), sides="tlrb")[0], "cassette")
save(cutout(s4.crop((995, 862, 1222, 950)), sides="tlrb")[0], "radio")
save(cutout(s4.crop((1225, 860, 1385, 950)), sides="tlrb")[0], "meter")
save(s4.crop((1410, 836, 1494, 928)), "fabric_tile")
# cabin interior strip (back-seat centre view) for detail inserts
save(s4.crop((20, 362, 1516, 732)), "cabin")
# taxi exterior views (sky made transparent)
for nm, box in {"taxi_front34": (24, 100, 512, 345), "taxi_side": (515, 115, 1068, 345),
                "taxi_rear34": (1080, 100, 1515, 345)}.items():
    c = s4.crop(box)
    img, _ = cutout(c, sides="tlrb", tol=18)
    save(img, nm)


# --- Sheet 1: framed poses (labels painted out with the paper white)
def unlabel(box, label_box):
    c = s1.crop(box)
    a = np.asarray(c).copy()
    lx0, ly0, lx1, ly1 = [v - o for v, o in zip(label_box, (box[0], box[1], box[0], box[1]))]
    sub = a[ly0:ly1, lx0:lx1].astype(int)
    ink = (sub.sum(2) < 600) & (sub[..., 2] >= sub[..., 0] - 5)
    ink = ndimage.binary_dilation(ink, iterations=2)
    a[ly0:ly1, lx0:lx1][ink] = (255, 255, 255)
    return Image.fromarray(a)


# windshield shots stay rectangular: the shot builder crops a window inside the glass frame
save(unlabel((752, 408, 1116, 682), (756, 410, 852, 476)), "pose07_driving")
save(unlabel((1130, 408, 1514, 682), (1134, 410, 1258, 476)), "pose08_parked_story")
# driver-window shot: sky becomes transparent so the street can sit behind it
img, _ = cutout(unlabel((22, 716, 430, 1004), (30, 722, 156, 790)), sides="tl", tol=10, keep_largest=True, feather=0.8)
save(img, "pose09_window")

# full-body poses on paper (for end card)
for nm, box, lab in [("pose01_wave", (95, 80, 300, 395), None), ("pose06_reassure", (460, 400, 650, 710), None),
                     ("pose12_cafe_laugh", (1190, 712, 1440, 1008), None)]:
    c = s1.crop(box)
    img, _ = cutout(c, sides="tlr", tol=24)
    save(img, nm)

# --- second reference pack (transparent PNGs, higher resolution)
for nm in ["new1_seated_gesture", "new3_glasses", "new4_open_door", "new5_taxi_front"]:
    im = Image.open(os.path.join(os.path.dirname(CUT), "..", "refs", nm + ".png")).convert("RGBA")
    save(im.crop(im.getbbox()), nm)
# passengers sheet: split the three figures on empty alpha columns
pas = Image.open(os.path.join(os.path.dirname(CUT), "..", "refs", "new2_passengers.png")).convert("RGBA")
col = np.asarray(pas.getchannel("A")).max(0) > 20
runs, s = [], None
for x, v in enumerate(col):
    if v and s is None: s = x
    if not v and s is not None:
        if x - s > 60: runs.append((s, x))
        s = None
if s is not None: runs.append((s, len(col)))
for nm, (x0, x1) in zip(["pax_groom", "pax_sad_lady", "pax_talker"], runs):
    c = pas.crop((x0, 0, x1, pas.height))
    save(c.crop(c.getbbox()), nm)
