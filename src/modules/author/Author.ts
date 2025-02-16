import {PullRequest} from "../pullrequest/PullRequest";

export interface Author {
  author: string;
  firstActiveDate: Date | null;
  lastActiveDate: Date | null;
  totalCommits: number;
  totalPRs: number;
  totalCodeComments: number;
  totalPRComments: number;
  totalPRReviews: number;

  //METRICS ARE ONLY INCLUDED FOR MERGED PULL REQUESTS
  //Counts are the total number of metrics that fall into each bracket.
  //Percentages are effectively the counts of each bucket divided by the total count of all of them.
  codingTimeCounts: { elite: number; good: number; fair: number; needsFocus: number }; //Elite < 1 hour, Good <4 hours, Fair <23 hours, NeedFocus >23 hours
  codingTimePercentages: { elite: number; good: number; fair: number; needsFocus: number };
  commentsCounts: { elite: number; good: number; fair: number; needsFocus: number };
  commentsPercentages: { elite: number; good: number; fair: number; needsFocus: number };
  prSizeCounts: { elite: number; good: number; fair: number; needsFocus: number }; //Number of PRs that PR Size lines of code:Elite <85 Good <138 -> Fair <209 ->NeedsFocus
  prSizePercentages: { elite: number; good: number; fair: number; needsFocus: number };
  prMaturityCounts: { elite: number; good: number; fair: number; needsFocus: number }; //Elite > 91%, Good > 84$, Fair >= 77%, NeedFocus < 77%
  prMaturityPercentages: { elite: number; good: number; fair: number; needsFocus: number };
  titleCounts: { elite: number; good: number; fair: number; needsFocus: number };
  titleMaturityPercentages: { elite: number; good: number; fair: number; needsFocus: number };

}

export function createAuthor(authorName: string): Author {
  return {
    author: authorName,
    firstActiveDate: null,
    lastActiveDate: null,
    totalCommits: 0,
    totalPRs: 0,
    totalPRComments: 0,
    totalPRReviews: 0,
    totalCodeComments: 0,

    prSizeCounts: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    prSizePercentages: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    prMaturityCounts: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    prMaturityPercentages: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    codingTimeCounts: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    codingTimePercentages: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    titleMaturityPercentages: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    commentsPercentages: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    titleCounts: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
    commentsCounts: {
      elite: 0,
      good: 0,
      fair: 0,
      needsFocus: 0,
    },
  };
}

function updateAuthorPRMetrics(metricCounts: any, metricPercentages: any, value: number, thresholds: number[]) {
  if (value < thresholds[0]) metricCounts.elite++;
  else if (value < thresholds[1]) metricCounts.good++;
  else if (value < thresholds[2]) metricCounts.fair++;
  else metricCounts.needsFocus++;

  const total = metricCounts.elite + metricCounts.good + metricCounts.fair + metricCounts.needsFocus;
  if (total > 0) {
    metricPercentages.elite = (metricCounts.elite / total) * 100;
    metricPercentages.good = (metricCounts.good / total) * 100;
    metricPercentages.fair = (metricCounts.fair / total) * 100;
    metricPercentages.needsFocus = (metricCounts.needsFocus / total) * 100;
  }
}

export function calculateAuthorMetrics(pr: PullRequest, authorRecords: Record<string, Author>) {
  let author = authorRecords[pr.author] || createAuthor(pr.author);

  author.totalPRs++;
  if (author.firstActiveDate) {
    author.firstActiveDate = pr.initialCommitCreatedAt < author.firstActiveDate ? pr.initialCommitCreatedAt : author.firstActiveDate;
  } else {
    author.firstActiveDate = pr.initialCommitCreatedAt;
  }

  if (author.lastActiveDate) {
    author.lastActiveDate = pr.lastCommitCreatedAt > author.lastActiveDate ? pr.lastCommitCreatedAt : author.lastActiveDate;
  } else {
    author.lastActiveDate = pr.initialCommitCreatedAt;
  }
  author.totalCommits += pr.commits.length;

  if (pr.mergedAt!=null) {
    /*Don't add metrics for PRs that are not merged. This is because likelihood is that a new PR will be raised at a
     later date with the same commits. This will skew the metrics as the same commits will be counted twice.*/
    updateAuthorPRMetrics(author.codingTimeCounts, author.codingTimePercentages, pr.codingTime, [30, 150, 1440]);
    updateAuthorPRMetrics(author.prSizeCounts, author.prSizePercentages, pr.size, [98, 148, 218]);
    if (pr.maturity>0) updateAuthorPRMetrics(author.prMaturityCounts, author.prMaturityPercentages, pr.maturity, [91, 84, 77]);
    updateAuthorPRMetrics(author.titleCounts, author.titleMaturityPercentages, pr.titleMaturity, [100, 75, 50]);
  }
  if (!authorRecords[pr.author]) authorRecords[pr.author] = author;
  console.log("Updated Author Metrics:", author);
}

/*
export function calculateAuthorCommentMetrics(pr: PullRequest, authorRecords: Record<string, Author>) {
  for (const comment of pr.comments) {
    if (authorRecords[comment.author]!) authorRecords[comment.author] = createAuthor(comment.author);
    authorRecords[comment.author].totalPRReviews
    //if (comment.type="review")
  }
}
*/
