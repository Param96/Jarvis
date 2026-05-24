from jarvis_backend.config.settings import Settings
from jarvis_backend.models.providers import DisabledModel
from jarvis_backend.models.router import ModelRouter


def test_router_uses_local_for_simple_request():
    settings = Settings(wake_word_enabled=False)
    local = DisabledModel()
    router = ModelRouter(settings, local, None)

    decision = router.choose("what time is it", [])

    assert decision.model is local
    assert decision.reason == "fast_local_path"


def test_router_uses_cloud_for_complex_request_when_available():
    settings = Settings(wake_word_enabled=False)
    local = DisabledModel()
    cloud = DisabledModel()
    router = ModelRouter(settings, local, cloud)

    decision = router.choose("architect a complex backend", [])

    assert decision.model is cloud
    assert decision.reason == "complex_or_long_context"
