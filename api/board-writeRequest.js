import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const createPost = boardData => {
    const result = requestJson(`${getServerUrl()}/posts`, {
        method: 'POST',
        body: JSON.stringify(boardData),
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    return result;
};

export const updatePost = (postId, boardData) => {
    const result = requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify(boardData),
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    return result;
};

export const fileUpload = (postId, formData) => {
    const result = requestJson(`${getServerUrl()}/posts/${postId}/images`, {
        method: 'POST',
        body: formData,
    });

    return result;
};

export const deletePostImage = (postId, imageId) => {
    return requestJson(
        `${getServerUrl()}/posts/${postId}/images/${imageId}`,
        {
            method: 'DELETE',
        },
    );
};

export const getBoardItem = postId => {
    const result = requestJson(getServerUrl() + `/posts/${postId}`, {
        method: 'GET',
        credentials: 'include',
    });

    return result;
};
