"""
Data validation and sanity checking before ingestion into Google Meridian.
"""

from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np


class DataValidationError(Exception):
    def __init__(self, message: str, code: str = "VALIDATION_ERROR", field: str = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.field = field


def validate_meridian_input(df: pd.DataFrame, config: Dict[str, Any]) -> Tuple[pd.DataFrame, List[str]]:
    """
    Validates dataset against econometric requirements for Google Meridian.
    """
    if df.empty or len(df) < 10:
        raise DataValidationError(
            f"Dataset insuficiente para modelagem Bayesiana. Forneça ao menos 10 observações temporais (recebido: {len(df)}).",
            code="INSUFFICIENT_OBSERVATIONS"
        )

    date_col = config.get("dateColumn", "date")
    kpi_col = config.get("kpiColumn", "revenue")
    media_channels = config.get("mediaChannels", [])

    if date_col not in df.columns:
        raise DataValidationError(f"Coluna de data '{date_col}' não encontrada no dataset.", code="MISSING_DATE_COLUMN", field=date_col)

    if kpi_col not in df.columns:
        raise DataValidationError(f"Coluna de KPI '{kpi_col}' não encontrada no dataset.", code="MISSING_KPI_COLUMN", field=kpi_col)

    if not media_channels:
        raise DataValidationError("Nenhum canal de mídia configurado.", code="EMPTY_MEDIA_CHANNELS")

    # Clean dates and check chronological order / duplicates
    cleaned_df = df.copy()
    try:
        cleaned_df[date_col] = pd.to_datetime(cleaned_df[date_col])
    except Exception as e:
        raise DataValidationError(f"Erro ao converter coluna de datas '{date_col}': {str(e)}", code="INVALID_DATE_FORMAT", field=date_col)

    if cleaned_df[date_col].duplicated().any():
        dup_count = cleaned_df[date_col].duplicated().sum()
        raise DataValidationError(
            f"Datas duplicadas encontradas ({dup_count} ocorrências). Agregue ou deduplique o dataset antes do ajuste do modelo.",
            code="DUPLICATE_DATES",
            field=date_col
        )

    # Sort chronologically
    cleaned_df = cleaned_df.sort_values(by=date_col).reset_index(drop=True)

    # Validate KPI column
    cleaned_df[kpi_col] = pd.to_numeric(cleaned_df[kpi_col], errors="coerce")
    if cleaned_df[kpi_col].isnull().all():
        raise DataValidationError(f"A coluna de KPI '{kpi_col}' não possui valores numéricos válidos.", code="INVALID_KPI_VALUES", field=kpi_col)

    if (cleaned_df[kpi_col] < 0).any():
        neg_count = (cleaned_df[kpi_col] < 0).sum()
        raise DataValidationError(f"A coluna de KPI '{kpi_col}' contém {neg_count} valores negativos.", code="NEGATIVE_KPI_VALUES", field=kpi_col)

    cleaned_df[kpi_col] = cleaned_df[kpi_col].fillna(0)

    # Validate Media Channels
    valid_channel_names = []
    for ch in media_channels:
        spend_col = ch.get("spendColumn")
        ch_name = ch.get("channelName") or spend_col

        if spend_col not in cleaned_df.columns:
            raise DataValidationError(f"Coluna de investimento '{spend_col}' do canal '{ch_name}' não existe no dataset.", code="MISSING_SPEND_COLUMN", field=spend_col)

        cleaned_df[spend_col] = pd.to_numeric(cleaned_df[spend_col], errors="coerce").fillna(0)
        
        # Check negative spend
        if (cleaned_df[spend_col] < 0).any():
            raise DataValidationError(f"Valores negativos de investimento detectados na coluna '{spend_col}'.", code="NEGATIVE_SPEND_VALUES", field=spend_col)

        # Check total spend
        total_sp = cleaned_df[spend_col].sum()
        if total_sp <= 0:
            raise DataValidationError(f"Canal '{ch_name}' possui investimento total nulo ou zero.", code="ZERO_SPEND_CHANNEL", field=spend_col)

        valid_channel_names.append(ch_name)

    # Validate controls if present
    control_cols = config.get("controlColumns", [])
    for ctrl in control_cols:
        if ctrl in cleaned_df.columns:
            cleaned_df[ctrl] = pd.to_numeric(cleaned_df[ctrl], errors="coerce").fillna(0)

    return cleaned_df, valid_channel_names
