import { headers } from "next/headers";
import { fetchCaseDetail as fetchDetail, fetchCases as fetchList } from "./legalmindApi";

async function requestCookie() { return (await headers()).get("cookie") || ""; }
export async function fetchCases() { return fetchList(await requestCookie()); }
export async function fetchCaseDetail(idCaso: string) { return fetchDetail(idCaso, await requestCookie()); }
export type { CaseDetail, CaseListItem } from "./legalmindApi";
