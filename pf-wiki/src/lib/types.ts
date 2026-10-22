export type Category = {
  slug: string;
  name: string;
  icon: string;
  description: string;
};

export type Source = {
  title: string;
  url: string;
};

export type ProblemEntry = {
  slug: string;
  category: string; // Category["slug"]
  title: string;
  short: string;
  symptoms: string[];
  likelyCauses: string[];
  fixSteps: string[];
  communitySolutions: string[];
  officialEscalation: string[];
  relatedForms?: string[];
  sources: Source[];
  lastVerified: string;
  tags: string[];
};
