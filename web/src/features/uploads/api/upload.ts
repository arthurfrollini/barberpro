import { api } from '@/shared/api';

/** Sends an image to POST /uploads; the returned id goes into logoFileId or avatarFileId. */
export const uploadImage = (file: File) => api.upload(file);
