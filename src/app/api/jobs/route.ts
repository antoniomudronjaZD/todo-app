import { type NextRequest } from "next/server";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
  created_at: number;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keywords = searchParams.get("keywords") || "";
  const city = searchParams.get("city") || "";

  try {
    const response = await fetch(
      "https://www.arbeitnow.com/api/job-board-api",
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      return Response.json(
        { error: "Failed to fetch jobs from Arbeitnow API" },
        { status: 502 }
      );
    }

    const data: ArbeitnowResponse = await response.json();
    let jobs = data.data;

    if (keywords) {
      const searchTerms = keywords.toLowerCase().split(",").map((s) => s.trim());
      jobs = jobs.filter((job) => {
        const searchable = `${job.title} ${job.description} ${job.tags.join(" ")}`.toLowerCase();
        return searchTerms.some((term) => searchable.includes(term));
      });
    }

    if (city) {
      const cityLower = city.toLowerCase();
      jobs = jobs.filter((job) => job.location.toLowerCase().includes(cityLower));
    }

    const sanitized = jobs.slice(0, 20).map((job) => ({
      slug: job.slug,
      company: job.company_name,
      title: job.title,
      description: job.description.replace(/<[^>]*>/g, "").slice(0, 500),
      remote: job.remote,
      url: job.url,
      tags: job.tags,
      jobTypes: job.job_types,
      location: job.location,
      createdAt: job.created_at,
    }));

    return Response.json({ jobs: sanitized, total: jobs.length });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
