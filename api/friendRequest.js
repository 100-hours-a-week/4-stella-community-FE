import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const searchUsers = (keyword, page = 0, size = 10) => {
    const query = new URLSearchParams({ keyword, page, size });
    return requestJson(
        `${getServerUrl()}/users/search?${query.toString()}`,
    );
};

export const sendFriendRequest = receiverId => {
    return requestJson(`${getServerUrl()}/api/friend-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId }),
    });
};

export const getReceivedFriendRequests = () => {
    return requestJson(`${getServerUrl()}/api/friend-requests/received`);
};

export const acceptFriendRequest = requestId => {
    return requestJson(
        `${getServerUrl()}/api/friend-requests/${requestId}/accept`,
        { method: 'POST' },
    );
};

export const rejectFriendRequest = requestId => {
    return requestJson(
        `${getServerUrl()}/api/friend-requests/${requestId}/reject`,
        { method: 'POST' },
    );
};

export const getFriends = () => {
    return requestJson(`${getServerUrl()}/api/friends`);
};
