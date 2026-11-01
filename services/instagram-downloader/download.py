# Downloads an account's latest posts without logging in. Run by open-terminal.ps1,
# which has already checked the arguments: download.py <username> <folder> <count or 0> <videos only: 0/1>

import itertools
import os
import sys

import instaloader
from instaloader.exceptions import InstaloaderException


def main():
    username, folder, count, videos_only = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4] == "1"
    loader = instaloader.Instaloader(
        quiet=False,
        download_pictures=not videos_only,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
        post_metadata_txt_pattern="",
        # {target} keeps posts shared with other accounts in this account's folder.
        dirname_pattern=os.path.join(folder, "{target}"),
    )
    profile = instaloader.Profile.from_username(loader.context, username)
    posts = profile.get_posts()
    new_files = 0
    for post in itertools.islice(posts, count) if count else posts:
        # A post with nothing to save counts as done, so nothing is downloaded twice.
        if videos_only and not (post.is_video or post.typename == "GraphSidecar"):
            continue
        if loader.download_post(post, target=profile.username):
            new_files += 1
    print(f"\n{new_files} posts saved.")


if __name__ == "__main__":
    try:
        main()
    except InstaloaderException as error:
        print(f"\n{error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nStopped. Files saved so far are kept.")
        sys.exit(130)
