"""
ZapSign API Service - Application Layer
"""
import logging
from typing import Any, Dict, Optional

import requests
from django.conf import settings

from ..models import Company

logger = logging.getLogger(__name__)


class ZapSignAPIException(Exception):
    """Custom exception for ZapSign API errors"""

    pass


class ZapSignService:
    """
    Service for communicating with ZapSign API
    Handles document creation and management
    """

    def __init__(self):
        self.base_url = settings.ZAPSIGN_BASE_URL
        self.org_id = settings.ZAPSIGN_ORG_ID

    def _get_headers(self, company: Company) -> Dict[str, str]:
        """Get headers for ZapSign API requests"""
        return {
            "Authorization": f"Token {company.api_token}",
            "Content-Type": "application/json",
        }

    def create_document(
        self, company: Company, document_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a document in ZapSign API

        Args:
            company: Company instance with API token
            document_data: Document data including name, signers, and PDF URL

        Returns:
            Dict with ZapSign response data

        Raises:
            ZapSignAPIException: If API request fails
        """
        url = f"{self.base_url}/docs/"
        headers = self._get_headers(company)

        # Prepare payload according to ZapSign API format
        payload = {
            "name": document_data["name"],
            "url_pdf": document_data["pdf_url"],
            "signers": [],
        }

        # Add signers to payload
        for signer in document_data.get("signers", []):
            payload["signers"].append(
                {
                    "name": signer["name"],
                    "email": signer["email"],
                    "sign_method": "email",  # Default signing method
                }
            )

        try:
            logger.info(f"Creating document in ZapSign: {document_data['name']}")
            response = requests.post(url, json=payload, headers=headers, timeout=30)

            if response.status_code == 201:
                logger.info("Document created successfully in ZapSign")
                return response.json()
            else:
                logger.error(
                    f"ZapSign API error: {response.status_code} - {response.text}"
                )
                raise ZapSignAPIException(
                    f"Failed to create document: {response.status_code} - {response.text}"
                )

        except requests.exceptions.RequestException as e:
            logger.error(f"Network error communicating with ZapSign: {str(e)}")
            raise ZapSignAPIException(f"Network error: {str(e)}")

    def get_document_status(
        self, company: Company, doc_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get document status from ZapSign API

        Args:
            company: Company instance with API token
            doc_token: Document token from ZapSign

        Returns:
            Dict with document status data or None if error
        """
        url = f"{self.base_url}/docs/{doc_token}/"
        headers = self._get_headers(company)

        try:
            response = requests.get(url, headers=headers, timeout=30)

            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(
                    f"Could not fetch document status: {response.status_code}"
                )
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching document status: {str(e)}")
            return None
