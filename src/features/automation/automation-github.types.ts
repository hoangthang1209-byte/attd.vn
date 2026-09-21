export type GitHubIssueLabel = {
  name: string;
};

export type GitHubIssueComment = {
  author: { login: string } | null;
  body: string;
  createdAt: string;
};

export type GitHubIssuePayload = {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  url: string;
  updatedAt: string;
  closedAt: string | null;
  labels: GitHubIssueLabel[];
  comments: GitHubIssueComment[];
};

export type GitHubPullRequestPayload = {
  number: number;
  title: string;
  url: string;
  state: "OPEN" | "CLOSED";
  merged: boolean;
  mergedAt: string | null;
  updatedAt: string;
};

export class AutomationGitHubConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutomationGitHubConfigError";
  }
}

export class AutomationGitHubRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AutomationGitHubRequestError";
    this.status = status;
  }
}

export type AutomationGitHubConfig =
  | {
      configured: false;
      configMessage: string;
      token: null;
      owner: string | null;
      repo: string | null;
      repoSlug: string;
    }
  | {
      configured: true;
      configMessage: null;
      token: string;
      owner: string;
      repo: string;
      repoSlug: string;
    };
