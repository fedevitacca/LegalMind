import { headers } from "next/headers";
import { fetchCaseDetail as fetchDetail, fetchCases as fetchList, fetchDeadlines as fetchDeadlineList } from "./legalmindApi";

async function requestCookie() { return (await headers()).get("cookie") || ""; }
export async function fetchCases() { return fetchList(await requestCookie()); }
export async function fetchCaseDetail(idCaso: string) { return fetchDetail(idCaso, await requestCookie()); }
export async function fetchDeadlines() { return fetchDeadlineList(await requestCookie()); }
export type { CaseDeadline, CaseDetail, CaseListItem } from "./legalmindApi";
