const ACCESS_TOKEN_KEY = 'accessToken';

export const setAccessToken = accessToken => {
    if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
};

export const clearAccessToken = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
};

export const parseJsonSafe = async response => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const withAccessToken = (options, accessToken) => {
    const headers = new Headers(options.headers || {});
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    return {
        credentials: 'include',
        ...options,
        headers,
    };
};

const refreshAccessToken = async requestUrl => {
    const refreshUrl = new URL('/users/token/refresh', requestUrl).toString();
    const response = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
    });
    const body = await parseJsonSafe(response);
    const accessToken = body?.data?.accessToken;

    if (!response.ok || !accessToken) return null;

    setAccessToken(accessToken);
    return accessToken;
};

export const requestWithAuthentication = async (url, options = {}) => {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    let response = await fetch(
        url,
        withAccessToken(options, accessToken),
    );

    if (
        response.status === 401 &&
        accessToken &&
        !url.includes('/users/token/refresh')
    ) {
        const refreshedToken = await refreshAccessToken(url);
        if (refreshedToken) {
            response = await fetch(
                url,
                withAccessToken(options, refreshedToken),
            );
        } else {
            clearAccessToken();
        }
    }

    return response;
};

export const requestJson = async (url, options = {}) => {
    const response = await requestWithAuthentication(url, options);
    const body = await parseJsonSafe(response);
    return {
        response,
        ok: response.ok,
        status: response.status,
        code: body && body.code ? body.code : null,
        data:
            body && Object.prototype.hasOwnProperty.call(body, 'data')
                ? body.data
                : body,
        body,
    };
};
