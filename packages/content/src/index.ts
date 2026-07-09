export interface MdxPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
}

export function createMdxLoader(posts: MdxPost[]) {
  return {
    getAll: () => posts,
    getBySlug: (slug: string) => posts.find((p) => p.slug === slug),
  };
}

export const SAMPLE_POSTS: MdxPost[] = [
  {
    slug: "introducing-arsenal",
    title: "Introducing Arsenal",
    description: "Forge websites from intent.",
    date: "2026-07-01",
    tags: ["announcement"],
  },
];
