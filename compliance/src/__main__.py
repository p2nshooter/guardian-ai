# ==============================================================================
# Copyright (c) 2024-2026 Yusron Efendi. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Author & Architect: Yusron Efendi <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
import uvicorn, os
port = int(os.environ.get('COMPLIANCE_PORT', '8093'))
uvicorn.run('src.api:app', host='0.0.0.0', port=port, log_level='info')
