using Aspose.OMR.Api;
using DiScanService.Interfaces;

namespace DiScanService.Readers;

public sealed class OmrReader(string templatePath) : IOmrReader
{
    public IReadOnlyDictionary<string, string> ReadForm(string filePath)
    {
        var engine   = new OmrEngine();
        var template = engine.GetTemplateProcessor(templatePath);
        var result   = template.RecognizeImage(filePath);

        var dict = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var element in result.RecognitionResults)
        {
            // element.Name = field name (e.g. "insAngulationPF")
            // element.ChosenAnswers = e.g. ["F"] or []
            var chosen = element.ChosenAnswers?.FirstOrDefault() ?? string.Empty;
            dict[element.Name] = chosen;
        }
        return dict;
    }
}
