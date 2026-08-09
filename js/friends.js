import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    acceptFriendRequest,
    getFriends,
    getReceivedFriendRequests,
    rejectFriendRequest,
    searchUsers,
    sendFriendRequest,
} from '../api/friendRequest.js';
import {
    authCheck,
    prependChild,
    resolveImageUrl,
} from '../utils/function.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_NOT_AUTHORIZED = 401;

const createEmptyMessage = message => {
    const empty = document.createElement('p');
    empty.className = 'emptyMessage';
    empty.textContent = message;
    return empty;
};

const createUserRow = (user, myInfo) => {
    const row = document.createElement('article');
    row.className = 'friendRow';

    const profile = document.createElement('img');
    profile.className = 'friendProfile';
    profile.src = resolveImageUrl(
        user.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );
    profile.alt = '';

    const nickname = document.createElement('strong');
    nickname.className = 'friendNickname';
    nickname.textContent = user.nickname;

    const requestButton = document.createElement('button');
    requestButton.type = 'button';
    requestButton.textContent =
        user.userId === myInfo.userId ? '나' : '친구 요청';
    requestButton.disabled = user.userId === myInfo.userId;
    requestButton.addEventListener('click', async () => {
        requestButton.disabled = true;
        const result = await sendFriendRequest(user.userId);

        if (result.ok) {
            requestButton.textContent = '요청 완료';
            return;
        }

        requestButton.disabled = false;
        Dialog(
            '친구 요청 실패',
            '이미 요청했거나 친구인 사용자인지 확인해주세요.',
        );
    });

    row.append(profile, nickname, requestButton);
    return row;
};

const renderSearchResults = (users, myInfo) => {
    const resultElement = document.querySelector('#friendSearchResults');
    resultElement.replaceChildren();

    if (users.length === 0) {
        resultElement.appendChild(
            createEmptyMessage('검색된 사용자가 없습니다.'),
        );
        return;
    }

    users.forEach(user => {
        resultElement.appendChild(createUserRow(user, myInfo));
    });
};

const createFriendRow = friend => {
    const row = document.createElement('article');
    row.className = 'friendRow';

    const profile = document.createElement('img');
    profile.className = 'friendProfile';
    profile.src = resolveImageUrl(
        friend.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );
    profile.alt = '';

    const info = document.createElement('div');
    info.className = 'requestSender';

    const nickname = document.createElement('strong');
    nickname.className = 'friendNickname';
    nickname.textContent = friend.nickname;

    const createdAt = document.createElement('span');
    createdAt.className = 'requestedAt';
    createdAt.textContent = `친구가 된 날 ${formatRequestedAt(friend.createdAt)}`;

    info.append(nickname, createdAt);
    row.append(profile, info);
    return row;
};

const loadFriends = async () => {
    const listElement = document.querySelector('#friendList');
    const countElement = document.querySelector('#friendCount');
    listElement.replaceChildren(
        createEmptyMessage('친구 목록을 불러오는 중입니다.'),
    );

    const result = await getFriends();
    if (!result.ok) {
        countElement.textContent = '0';
        listElement.replaceChildren(
            createEmptyMessage('친구 목록을 불러오지 못했습니다.'),
        );
        return;
    }

    const friends = Array.isArray(result.data) ? result.data : [];
    countElement.textContent = String(friends.length);
    listElement.replaceChildren();

    if (friends.length === 0) {
        listElement.appendChild(
            createEmptyMessage('아직 친구 관계인 사용자가 없습니다.'),
        );
        return;
    }

    friends.forEach(friend => {
        listElement.appendChild(createFriendRow(friend));
    });
};

const formatRequestedAt = requestedAt => {
    const date = new Date(requestedAt);
    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
};

const createRequestRow = (request, reloadRequests) => {
    const row = document.createElement('article');
    row.className = 'friendRow requestRow';

    const sender = document.createElement('div');
    sender.className = 'requestSender';

    const nickname = document.createElement('strong');
    nickname.className = 'friendNickname';
    nickname.textContent = request.senderNickname;

    const requestedAt = document.createElement('span');
    requestedAt.className = 'requestedAt';
    requestedAt.textContent = formatRequestedAt(request.requestedAt);

    const actions = document.createElement('div');
    actions.className = 'requestActions';

    const acceptButton = document.createElement('button');
    acceptButton.type = 'button';
    acceptButton.textContent = '수락';

    const rejectButton = document.createElement('button');
    rejectButton.type = 'button';
    rejectButton.className = 'secondaryButton';
    rejectButton.textContent = '거절';

    const handleRequest = async action => {
        acceptButton.disabled = true;
        rejectButton.disabled = true;
        const result = await action(request.requestId);

        if (result.ok) {
            await reloadRequests();
            await loadFriends();
            return;
        }

        acceptButton.disabled = false;
        rejectButton.disabled = false;
        Dialog('친구 요청 처리 실패', '친구 요청을 다시 확인해주세요.');
    };

    acceptButton.addEventListener('click', () =>
        handleRequest(acceptFriendRequest),
    );
    rejectButton.addEventListener('click', () =>
        handleRequest(rejectFriendRequest),
    );

    sender.append(nickname, requestedAt);
    actions.append(acceptButton, rejectButton);
    row.append(sender, actions);
    return row;
};

const loadReceivedRequests = async () => {
    const listElement = document.querySelector('#receivedRequestList');
    const countElement = document.querySelector('#receivedRequestCount');
    listElement.replaceChildren(
        createEmptyMessage('요청을 불러오는 중입니다.'),
    );

    const result = await getReceivedFriendRequests();
    if (!result.ok) {
        countElement.textContent = '0';
        listElement.replaceChildren(
            createEmptyMessage('받은 요청을 불러오지 못했습니다.'),
        );
        return;
    }

    const requests = Array.isArray(result.data) ? result.data : [];
    countElement.textContent = String(requests.length);
    listElement.replaceChildren();

    if (requests.length === 0) {
        listElement.appendChild(
            createEmptyMessage('새로 받은 친구 요청이 없습니다.'),
        );
        return;
    }

    requests.forEach(request => {
        listElement.appendChild(
            createRequestRow(request, loadReceivedRequests),
        );
    });
};

const addSearchEvents = myInfo => {
    const input = document.querySelector('#friendSearchInput');
    const button = document.querySelector('#friendSearchButton');

    const runSearch = async () => {
        const keyword = input.value.trim();
        if (!keyword) {
            Dialog('사용자 검색', '닉네임을 입력해주세요.');
            return;
        }

        button.disabled = true;
        const result = await searchUsers(keyword);
        button.disabled = false;

        if (!result.ok) {
            Dialog('사용자 검색 실패', '사용자를 검색하지 못했습니다.');
            return;
        }

        renderSearchResults(result.data.content || [], myInfo);
    };

    button.addEventListener('click', runSearch);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
        }
    });
};

const init = async () => {
    const response = await authCheck();
    if (response.status === HTTP_NOT_AUTHORIZED) return;

    const body = await response.json();
    const myInfo = body.data;
    const profileImage = resolveImageUrl(
        myInfo.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );

    prependChild(document.body, Header('친구 관리', 2, profileImage));
    addSearchEvents(myInfo);
    document
        .querySelector('#refreshFriends')
        .addEventListener('click', loadFriends);
    document
        .querySelector('#refreshReceivedRequests')
        .addEventListener('click', loadReceivedRequests);
    await Promise.all([loadFriends(), loadReceivedRequests()]);
};

init();
