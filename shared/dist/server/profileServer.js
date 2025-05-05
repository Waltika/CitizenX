export async function saveProfileServer({ gun, did, handle, profilePicture }) {
    const profile = { did, handle, profilePicture };
    await new Promise((resolve, reject) => {
        gun.get('profiles').get(did).put(profile, (ack) => {
            if (ack.err)
                reject(new Error(ack.err));
            else
                resolve();
        });
    });
}
