"""
ZapSign API Service - Application Layer
"""
import json
import logging
import uuid
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
    Handles document creation and status checking (as per requirements)
    """

    def __init__(self):
        self.base_url = settings.ZAPSIGN_BASE_URL
        self.org_id = settings.ZAPSIGN_ORG_ID

    def _get_headers(self, company: Company) -> Dict[str, str]:
        """Get headers for ZapSign API requests"""
        return {
            "Authorization": f"Bearer {company.api_token}",
            "Content-Type": "application/json",
        }

    def _build_signers_payload(self, signers_data: list) -> list:
        """Build signers payload for ZapSign API"""
        signers = []
        for signer in signers_data:
            signers.append(
                {
                    "name": signer["name"],
                    "email": signer["email"],
                    "external_id": f"signer-{uuid.uuid4().hex[:8]}",
                }
            )
        return signers

    def _build_document_payload(self, document_data: Dict[str, Any]) -> Dict[str, Any]:
        """Build document payload for ZapSign API"""
        return {
            "name": document_data["name"],
            "url_pdf": document_data["pdf_url"],
            "signers": self._build_signers_payload(document_data["signers"]),
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
            ZapSignAPIException: When API call fails
        """
        url = f"{self.base_url}/docs/"
        headers = self._get_headers(company)
        payload = self._build_document_payload(document_data)

        logger.info(f"Creating ZapSign document: {document_data['name']}")
        logger.debug(f"API URL: {url}")
        logger.debug(f"Payload: {payload}")

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=30)

            logger.info(f"ZapSign API response status: {response.status_code}")

            if response.status_code == 201:
                logger.info("Document created successfully in ZapSign")
                return response.json()
            else:
                error_msg = f"Failed to create document: {response.status_code} - {response.text}"
                logger.error(error_msg)

                # Provide more specific error details
                try:
                    error_detail = response.json().get("detail", response.text)
                    error_msg = f"Failed to create document: {response.status_code} - {error_detail}"
                except:
                    pass

                raise ZapSignAPIException(error_msg)

        except requests.exceptions.ConnectionError as e:
            error_msg = f"Connection error communicating with ZapSign: {e}"
            logger.error(error_msg)
            raise ZapSignAPIException(error_msg)

        except requests.exceptions.Timeout as e:
            error_msg = f"Request timeout communicating with ZapSign: {e}"
            logger.error(error_msg)
            raise ZapSignAPIException(error_msg)

        except requests.exceptions.RequestException as e:
            error_msg = f"Network error communicating with ZapSign: {e}"
            logger.error(error_msg)
            raise ZapSignAPIException(error_msg)

        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON response from ZapSign: {e}"
            logger.error(error_msg)
            raise ZapSignAPIException(error_msg)

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
