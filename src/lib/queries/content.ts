import "server-only";

import { query, queryOne } from "@/lib/db";

export type PostRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
};

export function listPosts(options: {
  includeInactive?: boolean;
  limit?: number;
} = {}): Promise<PostRow[]> {
  const { includeInactive = false, limit = 100 } = options;

  return query<PostRow>(
    `select p.id, p.title, p.description, p.status, p.created_at, p.updated_at,
            nullif(trim(concat(u.first_name, ' ', u.last_name)), '') as author_name
       from posts p
       left join users u on u.id = p.author_id
      where ($1::boolean is true or p.status = 'active')
      order by p.created_at desc
      limit $2`,
    [includeInactive, limit],
  );
}

export function getPost(id: number): Promise<PostRow | null> {
  return queryOne<PostRow>(
    `select p.id, p.title, p.description, p.status, p.created_at, p.updated_at,
            nullif(trim(concat(u.first_name, ' ', u.last_name)), '') as author_name
       from posts p
       left join users u on u.id = p.author_id
      where p.id = $1`,
    [id],
  );
}

export type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
  branch_id: string;
  branch_name: string;
};

export function listUsers(branchId: number | null): Promise<UserRow[]> {
  return query<UserRow>(
    `select u.id, u.first_name, u.last_name, u.middle_name, u.username,
            u.role, u.status, u.created_at, u.branch_id, b.name as branch_name
       from users u
       join branches b on b.id = u.branch_id
      where ($1::bigint is null or u.branch_id = $1)
      order by u.created_at desc`,
    [branchId],
  );
}

export function getUser(id: number): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `select u.id, u.first_name, u.last_name, u.middle_name, u.username,
            u.role, u.status, u.created_at, u.branch_id, b.name as branch_name
       from users u
       join branches b on b.id = u.branch_id
      where u.id = $1`,
    [id],
  );
}
