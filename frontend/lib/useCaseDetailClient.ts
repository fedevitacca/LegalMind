"use client";

import { useEffect, useState } from "react";
import {
  fetchAuthenticatedCaseDetail,
  type CaseDetail,
} from "./legalmindApi";

export function useCaseDetailClient(idCaso: string) {
  const [legalCase, setLegalCase] = useState<CaseDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!idCaso) return;
    let active = true;
    setError("");
    fetchAuthenticatedCaseDetail(idCaso)
      .then((result) => {
        if (active) setLegalCase(result);
      })
      .catch((reason) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "No se pudo cargar el expediente.");
        }
      });
    return () => {
      active = false;
    };
  }, [idCaso]);

  return { error, legalCase };
}
