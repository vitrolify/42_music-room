export function getAvatarSource(avatar: string) {
    switch (avatar) {
        case 'vinil': return require('../../assets/avatars/avatar_vinil.png');
        case 'tape':  return require('../../assets/avatars/avatar_tape.png');
        case 'globe': return require('../../assets/avatars/avatar_globe.png');
        case 'et':    return require('../../assets/avatars/avatar_et.png');
        case 'cat':   return require('../../assets/avatars/avatar_cat.png');
        case 'owl':   return require('../../assets/avatars/avatar_owl.png');
        default:      return require('../../assets/avatars/avatar_vinil.png');
    }
}