import 'package:flutter/material.dart';

import '../../../core/data/services/vin_decode_service.dart';

/// Campo VIN + botón "Decodificar VIN" (NHTSA VPIC).
class VinDecodeField extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<VinDecodeResult>? onDecoded;
  final InputDecoration? decoration;
  final bool required;

  const VinDecodeField({
    super.key,
    required this.controller,
    this.onDecoded,
    this.decoration,
    this.required = true,
  });

  @override
  State<VinDecodeField> createState() => _VinDecodeFieldState();
}

class _VinDecodeFieldState extends State<VinDecodeField> {
  final _service = VinDecodeService();
  bool _busy = false;
  String? _message;
  bool _messageIsError = false;

  Future<void> _decode() async {
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final normalized = VinDecodeService.normalizeVin(widget.controller.text);
      widget.controller.text = normalized;
      final result = await _service.decode(normalized);
      widget.onDecoded?.call(result);
      if (!mounted) return;
      setState(() {
        _message = 'VIN decodificado. Revisa marca, modelo y año.';
        _messageIsError = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _message = e.toString().replaceFirst('Exception: ', '');
        _messageIsError = true;
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextFormField(
          controller: widget.controller,
          textCapitalization: TextCapitalization.characters,
          maxLength: 17,
          decoration: (widget.decoration ??
                  InputDecoration(
                    labelText: widget.required ? 'VIN *' : 'VIN',
                    border: const OutlineInputBorder(),
                  ))
              .copyWith(counterText: ''),
          validator: widget.required
              ? (value) {
                  final v = (value ?? '').trim();
                  if (v.length < 11) {
                    return 'El VIN es obligatorio (mín. 11 caracteres)';
                  }
                  return null;
                }
              : null,
          onChanged: (v) {
            final upper = v.toUpperCase();
            if (upper != v) {
              final sel = widget.controller.selection;
              widget.controller.value = TextEditingValue(
                text: upper,
                selection: sel,
              );
            }
          },
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            onPressed: _busy ? null : _decode,
            icon: _busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.qr_code_scanner),
            label: Text(_busy ? 'Decodificando…' : 'Decodificar VIN'),
          ),
        ),
        if (_message != null) ...[
          const SizedBox(height: 6),
          Text(
            _message!,
            style: TextStyle(
              fontSize: 12,
              color: _messageIsError
                  ? Theme.of(context).colorScheme.error
                  : Colors.green.shade800,
            ),
          ),
        ],
      ],
    );
  }
}
