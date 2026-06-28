# ==============================================================================
# Copyright (c) 2024-2026 Axto AI. All rights reserved.
# Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
# Maintained by: Axto AI <hallo@axto.io>
# Proprietary and Confidential. Unauthorized copying is strictly prohibited.
# ==============================================================================
import uvicorn, os
port = int(os.environ.get('COMPLIANCE_PORT', '8093'))
uvicorn.run('src.api:app', host='0.0.0.0', port=port, log_level='info')
