import { COMMENT_MATURITY_LENGTH } from "../../constants";

export class MetricBuckets {
  public elite: number;
  public good: number;
  public fair: number;
  public needsFocus: number;

  constructor() {
    this.elite = 0;
    this.good = 0;
    this.fair = 0;
    this.needsFocus = 0;
  }

  static calculateCommentTitleMaturity(comment: string, MATURITY_LENGTH?: string) {
    if (!MATURITY_LENGTH) MATURITY_LENGTH = COMMENT_MATURITY_LENGTH;
    return Number(Number(comment.length / Number(MATURITY_LENGTH)).toFixed(2))*100;
  }

}
