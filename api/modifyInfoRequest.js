import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userModify = async changeData => {
    const result = await requestJson(`${getServerUrl()}/users/members/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(changeData),
    });
    return result;
};

export const userDelete = async () => {
    const result = await requestJson(`${getServerUrl()}/users/members${userId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });
    return result;
};
