import {PullRequest} from '../pullrequest/PullRequest';
import { calculateCommentTitleMaturity, MetricBuckets } from "../metricbuckets/MetricBuckets.types";

export interface Author {
  author: string;
  firstActiveDate: Date | null;
  lastActiveDate: Date | null;
  totalCommits: number;
  totalPRs: number;
  totalPRCommentsGiven: number;
  totalPRReviews: number;

  //METRICS ARE ONLY INCLUDED FOR MERGED PULL REQUESTS
  //Counts are the total number of metrics that fall into each bracket.
  //Percentages are effectively the counts of each bucket divided by the total count of all of them.
  codingTimeCounts: MetricBuckets; //Elite < 1 hour, Good <4 hours, Fair <23 hours, NeedFocus >23 hours
  codingTimePercentages:MetricBuckets;
  prCommitCommentMaturityCount: MetricBuckets; //Strength of an Authors commit comments
  prCommitCommentMaturityPercentages: MetricBuckets;
  prCommentGivenMaturityCounts: MetricBuckets; //Strength of PR Commenters comments given on PRs.
  prCommentGivenMaturityPercentages: MetricBuckets;
  prSizeCounts: MetricBuckets; //Number of PRs that PR Size lines of code:Elite <85 Good <138 -> Fair <209 ->NeedsFocus
  prSizePercentages: MetricBuckets;
  prMaturityCounts: MetricBuckets; //Elite > 91%, Good > 84$, Fair >= 77%, NeedFocus < 77%
  prMaturityPercentages: MetricBuckets;
  titleMaturityCounts: MetricBuckets;
  titleMaturityPercentages: MetricBuckets;
}

export function createAuthor(authorName: string): Author {
  return {
    author: authorName,
    firstActiveDate: null,
    lastActiveDate: null,
    totalCommits: 0,
    totalPRs: 0,
    totalPRCommentsGiven: 0,
    totalPRReviews: 0,

    prSizeCounts: new MetricBuckets(),
    prSizePercentages: new MetricBuckets(),
    prMaturityCounts: new MetricBuckets(),
    prMaturityPercentages: new MetricBuckets(),
    codingTimeCounts: new MetricBuckets(),
    codingTimePercentages: new MetricBuckets(),
    titleMaturityPercentages:new MetricBuckets(),
    prCommentGivenMaturityPercentages: new MetricBuckets(),
    titleMaturityCounts: new MetricBuckets(),
    prCommentGivenMaturityCounts: new MetricBuckets(),
    prCommitCommentMaturityCount: new MetricBuckets(),
    prCommitCommentMaturityPercentages: new MetricBuckets(),
  };
}

function updateAuthorBucketMetrics(
  metricCounts: MetricBuckets,
  metricPercentages: MetricBuckets,
  value: number,
  thresholds: number[],
  percentage?: boolean
) {
  if (percentage) {
    if (value > thresholds[0]) metricCounts.elite++;
    else if (value > thresholds[1]) metricCounts.good++;
    else if (value > thresholds[2]) metricCounts.fair++;
    else metricCounts.needsFocus++;
  } else {
    if (value < thresholds[0]) metricCounts.elite++;
    else if (value < thresholds[1]) metricCounts.good++;
    else if (value < thresholds[2]) metricCounts.fair++;
    else metricCounts.needsFocus++;
  }

  const total =
    metricCounts.elite +
    metricCounts.good +
    metricCounts.fair +
    metricCounts.needsFocus;
  if (total > 0) {
    metricPercentages.elite = (metricCounts.elite / total) * 100;
    metricPercentages.good = (metricCounts.good / total) * 100;
    metricPercentages.fair = (metricCounts.fair / total) * 100;
    metricPercentages.needsFocus = (metricCounts.needsFocus / total) * 100;
  }
}

export function calculateAuthorMetrics(
  pr: PullRequest,
  authorRecords: Record<string, Author>,
) {
  const author = authorRecords[pr.author] || createAuthor(pr.author);

  author.totalPRs++;
  if (author.firstActiveDate) {
    author.firstActiveDate =
      pr.initialCommitCreatedAt < author.firstActiveDate
        ? pr.initialCommitCreatedAt
        : author.firstActiveDate;
  } else {
    author.firstActiveDate = pr.initialCommitCreatedAt;
  }

  if (author.lastActiveDate) {
    author.lastActiveDate =
      pr.lastCommitCreatedAt > author.lastActiveDate
        ? pr.lastCommitCreatedAt
        : author.lastActiveDate;
  } else {
    author.lastActiveDate = pr.initialCommitCreatedAt;
  }

  if (pr.mergedAt != null) {
    /*Don't add metrics for PRs that are not merged. This is because likelihood is that a new PR will be raised at a
     later date with the same commits. This will skew the metrics as the same commits will be counted twice.*/
    updateAuthorBucketMetrics(
      author.codingTimeCounts,
      author.codingTimePercentages,
      pr.codingTime,
      [30, 150, 1440],
    );
    updateAuthorBucketMetrics(
      author.prSizeCounts,
      author.prSizePercentages,
      pr.size,
      [98, 148, 218],
    );
    if (pr.maturity > 0)
      updateAuthorBucketMetrics(
        author.prMaturityCounts,
        author.prMaturityPercentages,
        pr.maturity,
        [91, 84, 77],
        true
      );
    updateAuthorBucketMetrics(
      author.titleMaturityCounts,
      author.titleMaturityPercentages,
      pr.titleMaturity,
      [75, 50, 25],
      true
    );

    for (const commit of pr.commits) {
      if (commit.author == pr.author) {
        updateAuthorBucketMetrics(
          author.prCommitCommentMaturityCount,
          author.prCommitCommentMaturityPercentages,
          MetricBuckets.calculateCommentTitleMaturity(commit.title),
          [75, 50, 25],
          true
        );
        author.totalCommits++;
      }
    }
  }

  if (!authorRecords[pr.author]) authorRecords[pr.author] = author;
  console.log('Updated Author Metrics:', author);
  calculateAuthorCommentMetrics(pr, authorRecords);
}

function calculateAuthorCommentMetrics(
  pr: PullRequest,
  authorRecords: Record<string, Author>,
) {
  const commentAuthors: Record<string, Author> = {};
  for (const comment of pr.comments) {
    if (comment.author != pr.author) {
      if (authorRecords[comment.author] == null) {
        authorRecords[comment.author] = createAuthor(comment.author);
      }
      authorRecords[comment.author].totalPRCommentsGiven++;
      updateAuthorBucketMetrics(
        authorRecords[comment.author].prCommentGivenMaturityCounts,
        authorRecords[comment.author].prCommentGivenMaturityPercentages,
        MetricBuckets.calculateCommentTitleMaturity(comment.body),
        [75, 50, 25],true
      );
      console.log("Updated author's comment metrics:",comment.author, authorRecords[comment.author].prCommitCommentMaturityCount);
      commentAuthors[comment.author] = authorRecords[comment.author];
    }
  }
  for (const commentAuthor in commentAuthors) {
    authorRecords[commentAuthor].totalPRReviews++;
  }
}


