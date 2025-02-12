export interface PRComment {
    author: string;
    date: string;
    body: string;
    type: 'comment' | 'review';
}