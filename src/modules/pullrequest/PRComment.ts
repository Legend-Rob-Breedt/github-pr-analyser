//Issue - Comment made by author on PR
//Review - Comment made by another on PR
//Code Comment - Comment made on a specific line of code

export interface PRComment {
    author: string;
    date: Date;
    body: string;
    type: 'issue' | 'review' | 'code-comment';
}