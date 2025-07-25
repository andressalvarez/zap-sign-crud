"""
ZapSign ViewSets - Interface Layer
"""
import logging

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Company, Document, Signer
from .serializers import (
    CompanySerializer,
    DocumentCreateSerializer,
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentStatusUpdateSerializer,
    DocumentUpdateSerializer,
    SignerSerializer,
)
from .services.document_service import DocumentService
from .services.zapsign_service import ZapSignAPIException

logger = logging.getLogger(__name__)


class CompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Company operations
    """

    queryset = Company.objects.all().order_by("-created_at")
    serializer_class = CompanySerializer

    @extend_schema(
        summary="List all companies",
        description="Get a list of all companies with document counts",
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create a new company",
        description="Create a new company with ZapSign API token",
    )
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document operations with ZapSign integration
    """

    queryset = (
        Document.objects.select_related("company")
        .prefetch_related("signers")
        .order_by("-created_at")
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.document_service = DocumentService()

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == "list":
            return DocumentListSerializer
        elif self.action == "create":
            return DocumentCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return DocumentUpdateSerializer
        elif self.action == "update_status":
            return DocumentStatusUpdateSerializer
        else:
            return DocumentDetailSerializer

    @extend_schema(
        summary="List all documents",
        description="Get a paginated list of all documents with basic info",
        parameters=[
            OpenApiParameter(
                name="company_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Filter by company ID",
            )
        ],
    )
    def list(self, request, *args, **kwargs):
        """List documents with optional company filter"""
        company_id = request.query_params.get("company_id")

        if company_id:
            try:
                company_id = int(company_id)
                self.queryset = self.queryset.filter(company_id=company_id)
            except (ValueError, TypeError):
                return Response(
                    {"error": "Invalid company_id parameter"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Create a new document",
        description=(
            "Create a document and integrate with ZapSign API. "
            "Uses REAL ZapSign API format."
        ),
        request=DocumentCreateSerializer,
        responses={201: DocumentDetailSerializer},
    )
    def create(self, request, *args, **kwargs):
        """Create document with ZapSign integration"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Use document service to create with ZapSign integration
            document = self.document_service.create_document_with_signers(
                company_id=serializer.validated_data["company_id"],
                document_data={
                    "name": serializer.validated_data["name"],
                    "pdf_url": serializer.validated_data["pdf_url"],
                },
                signers_data=serializer.validated_data["signers"],
                created_by=serializer.validated_data["created_by"],
            )

            # Return detailed document data
            response_serializer = DocumentDetailSerializer(document)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        except ZapSignAPIException as e:
            logger.error(f"ZapSign API error: {str(e)}")
            return Response(
                {
                    "error": "ZapSign API Error",
                    "detail": str(e),
                    "code": "ZAPSIGN_API_ERROR",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Unexpected error creating document: {str(e)}")
            return Response(
                {
                    "error": "Internal server error",
                    "detail": "An unexpected error occurred while creating the document",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @extend_schema(
        summary="Get document details",
        description="Get detailed information about a document including signers and company data",
    )
    def retrieve(self, request, *args, **kwargs):
        """Get document with signers and company info"""
        return super().retrieve(request, *args, **kwargs)

    @extend_schema(
        summary="Update document",
        description="Update document information (local database only, not sent to ZapSign)",
        request=DocumentUpdateSerializer,
    )
    def update(self, request, *args, **kwargs):
        """Update document (local DB only)"""
        return super().update(request, *args, **kwargs)

    @extend_schema(
        summary="Partially update document",
        description="Partially update document information (local database only)",
    )
    def partial_update(self, request, *args, **kwargs):
        """Partial update document (local DB only)"""
        return super().partial_update(request, *args, **kwargs)

    @extend_schema(
        summary="Delete document",
        description="Delete document from local database (WARNING: Not synced to ZapSign)",
    )
    def destroy(self, request, *args, **kwargs):
        """Delete document (local DB only)"""
        document = self.get_object()
        logger.warning(f"Deleting document {document.id} - {document.name}")
        return super().destroy(request, *args, **kwargs)

    @extend_schema(
        summary="Update document status from ZapSign",
        description="Fetch the latest status from ZapSign API and update local database",
        methods=["POST"],
        request=DocumentStatusUpdateSerializer,
        responses={200: DocumentDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        """Update document status from ZapSign API"""
        document = self.get_object()

        try:
            updated_document = self.document_service.update_document_status(document.id)
            serializer = DocumentDetailSerializer(updated_document)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error updating document status: {str(e)}")
            return Response(
                {"error": "Failed to update status", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @extend_schema(
        summary="Sync with ZapSign API",
        description="Synchronize document metadata with ZapSign (UPDATE operation)",
        methods=["POST"],
        responses={200: DocumentDetailSerializer},
    )
    @action(detail=True, methods=["post"])
    def sync_with_zapsign(self, request, pk=None):
        """Sync document with ZapSign API"""
        document = self.get_object()

        if not document.token:
            return Response(
                {"error": "Document has no ZapSign token"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Here you could implement ZapSign UPDATE if needed
            # For now, just fetch status
            updated_document = self.document_service.update_document_status(document.id)
            serializer = DocumentDetailSerializer(updated_document)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error syncing with ZapSign: {str(e)}")
            return Response(
                {"error": "Failed to sync with ZapSign", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SignerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Signer operations (READ ONLY for individual signers)
    Note: Signers are created through document creation process
    """

    queryset = Signer.objects.select_related("document", "document__company").order_by(
        "-id"
    )
    serializer_class = SignerSerializer

    @extend_schema(
        summary="List all signers",
        description="Get a list of all signers across all documents",
        parameters=[
            OpenApiParameter(
                name="document_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description="Filter by document ID",
            ),
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description="Filter by signer status (PENDING, SIGNED, CANCELLED)",
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        """List signers with optional filters"""
        document_id = request.query_params.get("document_id")
        signer_status = request.query_params.get("status")

        queryset = self.queryset

        if document_id:
            try:
                document_id = int(document_id)
                queryset = queryset.filter(document_id=document_id)
            except (ValueError, TypeError):
                return Response(
                    {"error": "Invalid document_id parameter"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if signer_status:
            queryset = queryset.filter(status=signer_status.upper())

        # Apply the filtered queryset
        self.queryset = queryset
        return super().list(request, *args, **kwargs)

    @extend_schema(
        summary="Get signer details",
        description="Get detailed information about a specific signer",
    )
    def retrieve(self, request, *args, **kwargs):
        """Get signer details"""
        return super().retrieve(request, *args, **kwargs)

    # Disable create, update, and delete for individual signers
    def create(self, request, *args, **kwargs):
        return Response(
            {"error": "Signers must be created through document creation process"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def update(self, request, *args, **kwargs):
        return Response(
            {"error": "Signer updates should be done through ZapSign API"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def destroy(self, request, *args, **kwargs):
        return Response(
            {
                "error": "Signers cannot be deleted individually. Delete the document instead."
            },
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
