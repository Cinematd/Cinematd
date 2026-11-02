import { getStorage, ref, getDownloadURL } from "firebase/storage";
import defaultAvatar from "../assets/default-avatar.svg";

export { defaultAvatar };

/**
 * Resolves to the download URL of a member's avatar, or to the default
 * avatar if it can't be loaded (no avatar uploaded, or Cloud Storage is
 * unavailable, e.g. a 402 when the Firebase project isn't on the Blaze
 * plan). Never rejects, so callers can always show the member.
 */
export function getAvatarURL(uid) {
    if (!uid) {
        return Promise.resolve(defaultAvatar);
    }
    return getDownloadURL(ref(getStorage(), `avatars/${uid}`))
        .catch(() => defaultAvatar);
}
