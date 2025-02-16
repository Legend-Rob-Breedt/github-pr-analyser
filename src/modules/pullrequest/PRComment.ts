//Issue - Comment made by author of PR
//Review - Comment made by anyone reviewing PR
//Code Comment - Comment made by anyone on a specific line of code

export interface PRComment {
    author: string;
    date: Date;
    body: string;
    type: 'issue' | 'review' | 'code-comment';
}
