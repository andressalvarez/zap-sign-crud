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
            "Authorization": f"Bearer {company.api_token}",  # CORREGIDO: Bearer en lugar de Token
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

        # Prepare payload according to REAL ZapSign API format
        payload = {
            "name": document_data["name"],
            "url_pdf": document_data["pdf_url"],
            "signers": [],
            "external_id": f"DOC-{document_data.get('document_id', 'AUTO')}",  # AGREGADO
            "created_by": document_data.get("created_by", "API User"),  # AGREGADO
        }

        # Add signers to payload (formato correcto sin sign_method)
        for signer in document_data.get("signers", []):
            payload["signers"].append(
                {
                    "name": signer["name"],
                    "email": signer["email"],
                    # REMOVIDO: sign_method no existe en la API real
                }
            )

        try:
            logger.info(f"Creating document in ZapSign: {document_data['name']}")
            logger.info(f"Payload: {payload}")  # Log para debugging
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

    def update_document(
        self, company: Company, doc_token: str, update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update document metadata in ZapSign API

        Args:
            company: Company instance with API token
            doc_token: Document token from ZapSign
            update_data: Data to update (name, folder_path, date_limit_to_sign)

        Returns:
            Dict with updated document data or None if error
        """
        url = f"{self.base_url}/docs/{doc_token}/"
        headers = self._get_headers(company)

        try:
            logger.info(f"Updating document in ZapSign: {doc_token}")
            response = requests.put(url, json=update_data, headers=headers, timeout=30)

            if response.status_code == 200:
                logger.info("Document updated successfully in ZapSign")
                return response.json()
            else:
                logger.warning(f"Could not update document: {response.status_code}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Error updating document: {str(e)}")
            return None

    def delete_document(
        self, company: Company, doc_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Delete document in ZapSign API (soft delete)

        Args:
            company: Company instance with API token
            doc_token: Document token from ZapSign

        Returns:
            Dict with deleted document data or None if error
        """
        url = f"{self.base_url}/docs/{doc_token}/"
        headers = self._get_headers(company)

        try:
            logger.info(f"Deleting document in ZapSign: {doc_token}")
            response = requests.delete(url, headers=headers, timeout=30)

            if response.status_code == 200:
                logger.info("Document deleted successfully in ZapSign")
                return response.json()
            else:
                logger.warning(f"Could not delete document: {response.status_code}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Error deleting document: {str(e)}")
            return None

    def list_documents(
        self, company: Company, page: int = 1
    ) -> Optional[Dict[str, Any]]:
        """
        List documents from ZapSign API

        Args:
            company: Company instance with API token
            page: Page number for pagination

        Returns:
            Dict with documents list or None if error
        """
        url = f"{self.base_url}/docs/"
        headers = self._get_headers(company)
        params = {"page": page}

        try:
            response = requests.get(url, headers=headers, params=params, timeout=30)

            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Could not list documents: {response.status_code}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Error listing documents: {str(e)}")
            return None
