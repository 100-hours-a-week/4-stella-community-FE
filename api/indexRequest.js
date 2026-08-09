import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const getPosts = (page = 0, size = 5) => {
    const query = new URLSearchParams({ page, size });
    const result = requestJson(
        `${getServerUrl()}/posts?${query.toString()}`,
        {
            credentials: 'include',
        },
    );
    return result;
};

export const searchPosts = (keyword, page = 0, size = 5, sort = 'recent') => {
    const query = new URLSearchParams({
        keyword,
        page,
        size,
    });
    const result = requestJson(
        `${getServerUrl()}/posts/search?${query.toString()}`,
        {
            credentials: 'include',
        },
    );
    return result;
};
