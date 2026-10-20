import { Link } from "react-router-dom";
import { SmartImage } from "@/components/ui/SmartImage";
import type { ProjectSummaryDTO } from "@shared/types";

export function ProjectCard({ project }: { project: ProjectSummaryDTO }) {
  const artists = project.artists.map((a) => a.name).join(", ");
  return (
    <Link to={`/productions/${project.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg border border-border">
        <SmartImage
          media={project.cover}
          alt={project.title}
          aspect="square"
          className="transition-transform duration-[var(--dur-slow)] ease-premium group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-4">
        {project.category && <p className="eyebrow mb-1.5">{project.category}</p>}
        <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-fg-strong transition-colors group-hover:text-fg">
          {project.title}
        </h3>
        {artists && <p className="mt-1 text-sm text-fg-muted">{artists}</p>}
      </div>
    </Link>
  );
}
