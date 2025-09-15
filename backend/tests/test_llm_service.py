"""
Tests for LLM Service functionality
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from app.api.v1.endpoints.llm_proxy import LukaLibreLLMService, LLMProxyRequest
from app.core.config import settings


class TestLukaLibreLLMService:
    """Test LLM Service initialization and functionality"""

    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    def test_service_initialization_openrouter_primary(self, mock_chat_openai):
        """Test service initializes correctly with OpenRouter as primary"""
        # Mock settings for OpenRouter primary
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-openrouter-key'), \
             patch.object(settings, 'FALLBACK_LLM_PROVIDER', 'openai'), \
             patch.object(settings, 'OPENAI_API_KEY', 'test-openai-key'):
            
            service = LukaLibreLLMService()
            
            # Verify ChatOpenAI was called for all 4 LLM instances
            assert mock_chat_openai.call_count == 4
            assert service.primary_text_llm is not None
            assert service.primary_image_llm is not None
            assert service.fallback_text_llm is not None
            assert service.fallback_image_llm is not None

    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    def test_service_initialization_openai_primary(self, mock_chat_openai):
        """Test service initializes correctly with OpenAI as primary"""
        # Mock settings for OpenAI primary
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openai'), \
             patch.object(settings, 'OPENAI_API_KEY', 'test-openai-key'), \
             patch.object(settings, 'FALLBACK_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-openrouter-key'):
            
            service = LukaLibreLLMService()
            
            # Verify ChatOpenAI was called for all 4 LLM instances
            assert mock_chat_openai.call_count == 4

    def test_service_initialization_no_providers(self):
        """Test service fails initialization when no providers are configured"""
        with patch.object(settings, 'OPENAI_API_KEY', ''), \
             patch.object(settings, 'OPENROUTER_API_KEY', ''):
            
            with pytest.raises(ValueError, match="No LLM provider configured"):
                LukaLibreLLMService()

    @pytest.mark.asyncio
    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    async def test_call_llm_with_fallback_text_success(self, mock_chat_openai):
        """Test LLM call with fallback for text (no images)"""
        # Setup mocks
        mock_primary = AsyncMock()
        mock_primary.ainvoke.return_value = Mock(content="Test response")
        mock_chat_openai.return_value = mock_primary
        
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-key'), \
             patch.object(settings, 'FALLBACK_LLM_PROVIDER', 'openai'), \
             patch.object(settings, 'OPENAI_API_KEY', 'test-key'):
            
            service = LukaLibreLLMService()
            service.primary_text_llm = mock_primary
            
            messages = [{"role": "user", "content": "test"}]
            result = await service._call_llm_with_fallback(messages, has_images=False)
            
            assert result.content == "Test response"
            mock_primary.ainvoke.assert_called_once_with(messages)

    @pytest.mark.asyncio
    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    async def test_call_llm_with_fallback_image_success(self, mock_chat_openai):
        """Test LLM call with fallback for images"""
        # Setup mocks
        mock_primary = AsyncMock()
        mock_primary.ainvoke.return_value = Mock(content="Image analysis response")
        mock_chat_openai.return_value = mock_primary
        
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-key'), \
             patch.object(settings, 'FALLBACK_LLM_PROVIDER', 'openai'), \
             patch.object(settings, 'OPENAI_API_KEY', 'test-key'):
            
            service = LukaLibreLLMService()
            service.primary_image_llm = mock_primary
            
            messages = [{"role": "user", "content": "analyze this image"}]
            result = await service._call_llm_with_fallback(messages, has_images=True)
            
            assert result.content == "Image analysis response"
            mock_primary.ainvoke.assert_called_once_with(messages)

    @pytest.mark.asyncio
    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    async def test_call_llm_with_fallback_primary_fails_fallback_succeeds(self, mock_chat_openai):
        """Test fallback mechanism when primary LLM fails"""
        # Setup mocks
        mock_primary = AsyncMock()
        mock_primary.ainvoke.side_effect = Exception("Primary failed")
        
        mock_fallback = AsyncMock()
        mock_fallback.ainvoke.return_value = Mock(content="Fallback response")
        
        mock_chat_openai.return_value = mock_primary
        
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-key'), \
             patch.object(settings, 'FALLBACK_LLM_PROVIDER', 'openai'), \
             patch.object(settings, 'OPENAI_API_KEY', 'test-key'):
            
            service = LukaLibreLLMService()
            service.primary_text_llm = mock_primary
            service.fallback_text_llm = mock_fallback
            
            messages = [{"role": "user", "content": "test"}]
            result = await service._call_llm_with_fallback(messages, has_images=False)
            
            assert result.content == "Fallback response"
            mock_primary.ainvoke.assert_called_once_with(messages)
            mock_fallback.ainvoke.assert_called_once_with(messages)

    @pytest.mark.asyncio
    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    async def test_process_json_request_identify_schema(self, mock_chat_openai):
        """Test processing JSON request for schema identification"""
        # Setup mock
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = Mock(content="sueldo")
        mock_chat_openai.return_value = mock_llm
        
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-key'):
            
            service = LukaLibreLLMService()
            service.primary_text_llm = mock_llm
            
            request = LLMProxyRequest(
                content="Tengo un sueldo de 800000",
                step="identify_schema",
                schemas=["sueldo", "gasto"]
            )
            
            result = await service.process_json_request(request)
            
            assert result == "sueldo"
            mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    async def test_process_json_request_generate_sql_json(self, mock_chat_openai):
        """Test processing JSON request for SQL/JSON generation"""
        # Setup mock
        mock_llm = AsyncMock()
        expected_response = '{"sql_inserts": "INSERT INTO...", "json_data": {...}}'
        mock_llm.ainvoke.return_value = Mock(content=expected_response)
        mock_chat_openai.return_value = mock_llm
        
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-key'):
            
            service = LukaLibreLLMService()
            service.primary_text_llm = mock_llm
            
            request = LLMProxyRequest(
                content="Sueldo: 800000, Empresa: Tech Corp",
                step="generate_sql_json",
                schema_name="sueldo"
            )
            
            result = await service.process_json_request(request)
            
            assert result == expected_response
            mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    async def test_process_multipart_request_with_image(self, mock_chat_openai):
        """Test processing multipart request with image file"""
        # Setup mock
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = Mock(content="Image analysis complete")
        mock_chat_openai.return_value = mock_llm
        
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-key'):
            
            service = LukaLibreLLMService()
            service.primary_image_llm = mock_llm
            
            # Mock file
            mock_file = Mock()
            mock_file.content_type = "image/png"
            mock_file.read = AsyncMock(return_value=b"fake_image_data")
            mock_file.filename = "test.png"
            
            result = await service.process_multipart_request(
                prompt="Analyze this image",
                files=[mock_file]
            )
            
            assert result == "Image analysis complete"
            mock_llm.ainvoke.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.api.v1.endpoints.llm_proxy.ChatOpenAI')
    async def test_process_multipart_request_text_only(self, mock_chat_openai):
        """Test processing multipart request without images"""
        # Setup mock
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = Mock(content="Text response")
        mock_chat_openai.return_value = mock_llm
        
        with patch.object(settings, 'DEFAULT_LLM_PROVIDER', 'openrouter'), \
             patch.object(settings, 'OPENROUTER_API_KEY', 'test-key'):
            
            service = LukaLibreLLMService()
            service.primary_text_llm = mock_llm
            
            result = await service.process_multipart_request(
                prompt="Generate a response",
                files=[]
            )
            
            assert result == "Text response"
            mock_llm.ainvoke.assert_called_once()