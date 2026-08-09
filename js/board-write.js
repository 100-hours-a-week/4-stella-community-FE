import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    getQueryString,
    getServerUrl,
    prependChild,
    resolveImageUrl,
} from '../utils/function.js';
import {
    createPost,
    deletePostImage,
    fileUpload,
    updatePost,
    getBoardItem,
} from '../api/board-writeRequest.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;

const MAX_TITLE_LENGTH = 26;
const MAX_CONTENT_LENGTH = 1500;
const MAX_IMAGE_COUNT = 30;
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';

const submitButton = document.querySelector('#submit');
const titleInput = document.querySelector('#title');
const contentInput = document.querySelector('#content');
const imageInput = document.querySelector('#image');
const imagePreviewText = document.getElementById('imagePreviewText');
const imageCountElement = document.getElementById('imageCount');
const contentHelpElement = document.querySelector(
    '.inputBox p[name="content"]',
);

const boardWrite = {
    title: '',
    content: '',
};

let isModifyMode = false;
let modifyData = {};
let loginUserId = null;
let selectedFiles = [];
let existingImages = [];
const deletedImageIds = new Set();
let nextSelectedFileId = 1;

const observeSignupData = () => {
    const { title, content } = boardWrite;
    if (!title || !content || title === '' || content === '') {
        submitButton.disabled = true;
        submitButton.style.backgroundColor = '#ACA0EB';
    } else {
        submitButton.disabled = false;
        submitButton.style.backgroundColor = '#7F6AEE';
    }
};

// 엘리먼트 값 가져오기 title, content
const getBoardData = () => {
    return {
        userId: loginUserId,
        title: boardWrite.title,
        summary: null,
        content: boardWrite.content,
    };
};

const uploadSelectedFiles = async postId => {
    if (selectedFiles.length === 0) return true;

    const formData = new FormData();
    selectedFiles.forEach(item => formData.append('files', item.file));
    const { ok } = await fileUpload(postId, formData);
    return ok;
};

const deleteMarkedImages = async postId => {
    const results = await Promise.all(
        Array.from(deletedImageIds).map(imageId =>
            deletePostImage(postId, imageId),
        ),
    );

    return results.every(result => result.ok);
};

const getActiveImageCount = () =>
    existingImages.filter(image => !deletedImageIds.has(image.imageId)).length +
    selectedFiles.length;

const updateImageCount = () => {
    if (imageCountElement) {
        imageCountElement.textContent = `${getActiveImageCount()} / ${MAX_IMAGE_COUNT}`;
    }
};

const createImageCard = ({
    imageUrl,
    fileName,
    statusText,
    buttonText,
    isDeleted = false,
    onButtonClick,
}) => {
    const card = document.createElement('article');
    card.className = 'imageCard';
    card.classList.toggle('isDeleted', isDeleted);

    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = fileName;

    const info = document.createElement('div');
    info.className = 'imageCardInfo';

    const name = document.createElement('span');
    name.className = 'imageFileName';
    name.textContent = fileName;

    const status = document.createElement('span');
    status.className = 'imageStatus';
    status.textContent = statusText;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = isDeleted ? 'restoreImage' : 'deleteFile';
    button.textContent = buttonText;
    button.addEventListener('click', onButtonClick);

    info.append(name, status);
    card.append(image, info, button);
    return card;
};

const renderImagePreviews = () => {
    if (!imagePreviewText) return;

    imagePreviewText.replaceChildren();

    existingImages.forEach(image => {
        const isDeleted = deletedImageIds.has(image.imageId);
        imagePreviewText.appendChild(
            createImageCard({
                imageUrl: resolveImageUrl(image.imageUrl),
                fileName: image.originalFileName,
                statusText: isDeleted ? '삭제 예정' : '기존 이미지',
                buttonText: isDeleted ? '삭제 취소' : '삭제',
                isDeleted,
                onButtonClick: () => {
                    if (isDeleted) {
                        if (getActiveImageCount() >= MAX_IMAGE_COUNT) {
                            Dialog(
                                '이미지',
                                `이미지는 최대 ${MAX_IMAGE_COUNT}장까지 유지할 수 있습니다.`,
                            );
                            return;
                        }
                        deletedImageIds.delete(image.imageId);
                    } else {
                        deletedImageIds.add(image.imageId);
                    }
                    renderImagePreviews();
                },
            }),
        );
    });

    selectedFiles.forEach(item => {
        imagePreviewText.appendChild(
            createImageCard({
                imageUrl: item.previewUrl,
                fileName: item.file.name,
                statusText: '새 이미지',
                buttonText: '선택 취소',
                onButtonClick: () => {
                    URL.revokeObjectURL(item.previewUrl);
                    selectedFiles = selectedFiles.filter(
                        selected => selected.id !== item.id,
                    );
                    renderImagePreviews();
                },
            }),
        );
    });

    if (existingImages.length === 0 && selectedFiles.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'emptyImages';
        empty.textContent = '선택된 이미지가 없습니다.';
        imagePreviewText.appendChild(empty);
    }

    updateImageCount();
};

const addSelectedFiles = files => {
    const invalidType = files.find(file => !ALLOWED_IMAGE_TYPES.has(file.type));
    if (invalidType) {
        Dialog('이미지 형식', 'JPEG 또는 PNG 이미지만 선택할 수 있습니다.');
        return;
    }

    const oversized = files.find(file => file.size > MAX_IMAGE_SIZE);
    if (oversized) {
        Dialog('이미지 크기', '이미지 한 장은 20MB를 초과할 수 없습니다.');
        return;
    }

    const duplicated = file =>
        selectedFiles.some(
            item =>
                item.file.name === file.name &&
                item.file.size === file.size &&
                item.file.lastModified === file.lastModified,
        );
    const newFiles = files.filter(file => !duplicated(file));

    if (getActiveImageCount() + newFiles.length > MAX_IMAGE_COUNT) {
        Dialog(
            '이미지 개수',
            `이미지는 최대 ${MAX_IMAGE_COUNT}장까지 선택할 수 있습니다.`,
        );
        return;
    }

    selectedFiles.push(
        ...newFiles.map(file => ({
            id: nextSelectedFileId++,
            file,
            previewUrl: URL.createObjectURL(file),
        })),
    );
    renderImagePreviews();
};

// 버튼 클릭시 이벤트
const addBoard = async () => {
    const boardData = getBoardData();

    // boardData가 false일 경우 함수 종료
    if (!boardData) return Dialog('게시글', '게시글을 입력해주세요.');

    if (boardData.title.length > MAX_TITLE_LENGTH)
        return Dialog('게시글', '제목은 26자 이하로 입력해주세요.');

    if (!isModifyMode) {
        const { ok, status, data } = await createPost(boardData);
        if (!ok) throw new Error('서버 응답 오류');

        if (status === HTTP_CREATED) {
            if (!(await uploadSelectedFiles(data.postId))) {
                Dialog(
                    '이미지 업로드 실패',
                    '게시글은 저장됐지만 이미지를 업로드하지 못했습니다.',
                );
                return;
            }
            window.location.href = `/html/board.html?id=${data.postId}`;
        } else {
            const helperElement = contentHelpElement;
            helperElement.textContent = '제목, 내용을 모두 작성해주세요.';
        }
    } else {
        // 게시글 작성 api 호출
        const postId = getQueryString('postId');
        const setData = {
            ...boardData,
        };

        const { ok, status } = await updatePost(postId, setData);
        if (!ok) throw new Error('서버 응답 오류');

        if (status === HTTP_OK) {
            if (!(await deleteMarkedImages(postId))) {
                Dialog('이미지 삭제 실패', '선택한 이미지를 삭제하지 못했습니다.');
                return;
            }
            if (!(await uploadSelectedFiles(postId))) {
                Dialog('이미지 업로드 실패', '이미지를 업로드하지 못했습니다.');
                return;
            }
            window.location.href = `/html/board.html?id=${postId}`;
        } else {
            Dialog('게시글', '게시글 수정 실패');
        }
    }
};
const changeEventHandler = async (event, uid) => {
    if (uid == 'title') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '제목을 입력해주세요.';
        } else if (value.length > MAX_TITLE_LENGTH) {
            helperElement.textContent = '제목은 26자 이하로 입력해주세요.';
            titleInput.value = value.substring(0, MAX_TITLE_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_TITLE_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'content') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '내용을 입력해주세요.';
        } else if (value.length > MAX_CONTENT_LENGTH) {
            helperElement.textContent = '내용은 1500자 이하로 입력해주세요.';
            contentInput.value = value.substring(0, MAX_CONTENT_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_CONTENT_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'image') {
        const files = Array.from(event.target.files);
        if (files.length === 0) {
            console.log('파일이 선택되지 않았습니다.');
            return;
        }

        addSelectedFiles(files);
        imageInput.value = '';
    }

    observeSignupData();
};
// 수정모드시 사용하는 게시글 단건 정보 가져오기
const getBoardModifyData = async postId => {
    const { ok, data } = await getBoardItem(postId);
    if (!ok) throw new Error('서버 응답 오류');
    return data;
};

// 수정 모드인지 확인
const checkModifyMode = () => {
    const postId = getQueryString('postId');
    if (!postId) return false;
    return postId;
};

// 이벤트 등록
const addEvent = () => {
    submitButton.addEventListener('click', addBoard);
    titleInput.addEventListener('input', event =>
        changeEventHandler(event, 'title'),
    );
    contentInput.addEventListener('input', event =>
        changeEventHandler(event, 'content'),
    );
    imageInput.addEventListener('change', event =>
        changeEventHandler(event, 'image'),
    );
};

const setModifyData = data => {
    titleInput.value = data.title;
    contentInput.value = data.content;

    existingImages = data.images || [];
    renderImagePreviews();

    boardWrite.title = data.title;
    boardWrite.content = data.content;

    observeSignupData();
};

const init = async () => {
    const dataResponse = await authCheck();
    const data = await dataResponse.json();
    loginUserId = data.data.userId;
    const modifyId = checkModifyMode();

    const profileImage = resolveImageUrl(
        data.data.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );

    prependChild(document.body, Header('커뮤니티', 1, profileImage));

    if (modifyId) {
        isModifyMode = true;
        modifyData = await getBoardModifyData(modifyId);

        if (data.data.userId !== modifyData.userId) {
            Dialog('권한 없음', '권한이 없습니다.', () => {
                window.location.href = '/';
            });
        } else {
            setModifyData(modifyData);
        }
    }

    renderImagePreviews();

    addEvent();
};

init();
