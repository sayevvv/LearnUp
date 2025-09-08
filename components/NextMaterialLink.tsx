"use client";

import Link from 'next/link';

type Props = {
	href: string;
	roadmapId: string;
	m: number;
	s: number;
	className?: string;
	children: React.ReactNode;
};

export default function NextMaterialLink({ href, roadmapId, m, s, className, children }: Props) {
	const key = `readDone:${roadmapId}:m-${m}-t-${s}`;
	const onClick = () => {
		try {
			if (!sessionStorage.getItem(key)) {
				// Fire-and-forget; keepalive ensures it completes even during navigation
				fetch(`/api/roadmaps/${roadmapId}/progress`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ milestoneIndex: m, taskIndex: s, done: true }),
					keepalive: true,
				}).catch(() => {});
				sessionStorage.setItem(key, '1');
			}
		} catch {}
	};
	return (
		<Link href={href} className={className} onClick={onClick} prefetch={false}>
			{children}
		</Link>
	);
}

