import 'package:flutter_test/flutter_test.dart';
import 'package:rerendet_mobile/main.dart';

void main() {
  testWidgets('Rerendet app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RerendetCustomerApp());

    // Verify splash screen content
    expect(find.text('RERENDET'), findsOneWidget);
    expect(find.text('Premium Kenyan Coffee\nFrom Farm to Cup'), findsOneWidget);

    // Settle the delayed navigation timer
    await tester.pumpAndSettle(const Duration(seconds: 3));
  });
}
