import {PRCommit} from "./PRCommit";
import {PRComment} from "./PRComment";

export interface PullRequest {
    number: number
    author: string;
    created_at: Date;
    merged_at?: Date | null;
    merge_state: string;
    state: string;
    comments: PRComment[];
    commits: PRCommit[];
    additions: number;
    deletions: number;
    lastProcessed: Date;
}