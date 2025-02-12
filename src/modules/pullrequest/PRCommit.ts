export interface PRCommit {
    sha: string;
    author: string;
    date: string;
    linesAdded: number;
    linesRemoved: number;
    type: 'commit';
}