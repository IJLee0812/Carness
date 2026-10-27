"""comma2k19 저장소의 예제 세그먼트(Example_1, RAV4, 약 45MB)를 data/raw/comma2k19/에 받는다."""

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from carness.io.comma2k19 import local_path

REPO = "commaai/comma2k19"
BRANCH = "master"
DEST = Path(__file__).resolve().parents[1] / "data" / "raw" / "comma2k19"


def main() -> None:
    with urllib.request.urlopen(f"https://api.github.com/repos/{REPO}/git/trees/{BRANCH}?recursive=1") as r:
        tree = json.load(r)["tree"]
    files = [x for x in tree if x["type"] == "blob" and x["path"].startswith("Example_1/")]
    skip_video = "--no-video" in sys.argv
    for x in files:
        if skip_video and x["path"].endswith(".hevc"):
            continue
        out = DEST / local_path(x["path"])
        if out.exists() and out.stat().st_size == x["size"]:
            continue
        out.parent.mkdir(parents=True, exist_ok=True)
        quoted = urllib.parse.quote(x["path"])
        try:
            urllib.request.urlretrieve(f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{quoted}", out)
        except urllib.error.HTTPError:
            urllib.request.urlretrieve(f"https://media.githubusercontent.com/media/{REPO}/{BRANCH}/{quoted}", out)
        print(f"{out.relative_to(DEST)}  {out.stat().st_size:,} B")
    print(f"완료: {DEST / 'Example_1'}")


if __name__ == "__main__":
    main()
